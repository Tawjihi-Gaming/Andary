using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using Backend.Models.Configs;
using System.Text.Json;
using System.Security.Cryptography;

namespace Backend.Controllers
{
    public partial class AuthController
    {
        #region JWT & Refresh Token Helpers

        private string GenerateJwtToken(Player player)
        {
            var key = Environment.GetEnvironmentVariable("JWT_KEY")!;
            var issuer = Environment.GetEnvironmentVariable("JWT_ISSUER")!;
            var audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")!;

            var keyBytes = Encoding.UTF8.GetBytes(key);
            var securityKey = new SymmetricSecurityKey(keyBytes);
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, player.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string GenerateToken()
        {
            var randomBytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        private string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
            return Convert.ToBase64String(bytes);
        }

        #endregion

        #region Cookie Helpers

        private CookieOptions BuildAuthCookieOptions(DateTime expires)
        {
            bool isDev = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
            return new CookieOptions
            {
                HttpOnly = true,
                Secure = !isDev,
                SameSite = isDev ? SameSiteMode.Lax : SameSiteMode.None,
                Expires = expires
            };
        }

        private void SetJwtCookie(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return;
            Response.Cookies.Append("jwt", token, BuildAuthCookieOptions(DateTime.UtcNow.AddHours(1)));
        }

        private void SetRefreshToken(Player player)
        {
            if (player == null) return;

            var refreshToken = GenerateToken();

            player.RefreshToken = HashToken(refreshToken);
            player.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

            Response.Cookies.Append("refreshToken", refreshToken,
                BuildAuthCookieOptions(player.RefreshTokenExpiryTime.Value));
        }

        private async Task<IActionResult> SetAuthCookiesAsync(Player player)
        {
            if (player == null)
                return BadRequest(new { msg = "Player is null" });

            var token = GenerateJwtToken(player);
            SetJwtCookie(token);

            SetRefreshToken(player);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                msg = "Authentication successful",
                Id = player.Id,
                Username = player.Username,
                AvatarImageName = player.AvatarImageName,
                Email = GetPlayerEmail(player)
            });
        }

        #endregion

        #region Google OAuth Helpers

        private Dictionary<string, string> BuildGoogleTokenRequestBody(string code)
        {
            if (_googleConfig?.web == null || string.IsNullOrWhiteSpace(code))
                return new Dictionary<string, string>();

            return new Dictionary<string, string>
            {
                { "code", code},
                { "client_id", _googleConfig.web.client_id ?? "" },
                { "client_secret", _googleConfig.web.client_secret ?? "" },
                { "redirect_uri", _googleConfig.web.redirect_uris?.FirstOrDefault() ?? "" },
                { "grant_type", "authorization_code" }
            };
        }

        private async Task<GoogleTokenResponse?> ExchangeCodeForGoogleTokenAsync(string code)
        {
            var body = BuildGoogleTokenRequestBody(code);
            if (body.Count == 0) return null;

            var requestContent = new FormUrlEncodedContent(body);
            var response = await _httpClient.PostAsync(_googleConfig.web?.token_uri ?? "", requestContent);
            if (!response.IsSuccessStatusCode)
                return null;

            var responseContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<GoogleTokenResponse>(responseContent);
        }

        private async Task<IEnumerable<SecurityKey>> GetGoogleSigningKeysAsync()
        {
            var response = await _httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/certs");
            if (!response.IsSuccessStatusCode)
                return Enumerable.Empty<SecurityKey>();

            var jwksJson = await response.Content.ReadAsStringAsync();
            var jwks = new JsonWebKeySet(jwksJson);
            return jwks.GetSigningKeys();
        }

        private async Task<bool> IsGoogleIdTokenValid(JwtSecurityToken jwtToken)
        {
            var signingKeys = await GetGoogleSigningKeysAsync();
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = "https://accounts.google.com",
                ValidAudience = _googleConfig.web?.client_id,
                IssuerSigningKeys = signingKeys,
                ClockSkew = TimeSpan.Zero
            };
            try
            {
                tokenHandler.ValidateToken(jwtToken.RawData, validationParameters, out _);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private async Task<(string? Email, string? Name, string? GoogleId)> ParseGoogleIdToken(string idToken)
        {
            if (string.IsNullOrWhiteSpace(idToken))
                return (null, null, null);

            var handler = new JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(idToken);

            var exp = jwtToken.Claims.FirstOrDefault(c => c.Type == "exp")?.Value;
            if (!long.TryParse(exp, out var expSeconds)
                || DateTimeOffset.FromUnixTimeSeconds(expSeconds) < DateTimeOffset.UtcNow
                || !await IsGoogleIdTokenValid(jwtToken))
                return (null, null, null);

            var email = jwtToken.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
            var name = jwtToken.Claims.FirstOrDefault(c => c.Type == "name")?.Value;
            var googleId = jwtToken.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;

            return (email, name, googleId);
        }

        private async Task<Player> GetOrCreateGooglePlayerAsync(string googleId, string? name, string? email)
        {
            var player = await _db.Players
                .Include(p => p.AuthOAuths)
                .FirstOrDefaultAsync(p => p.AuthOAuths.Any(a => a.Provider == "Google"
                                     && a.ProviderUserId == googleId));

            if (player != null)
                return player;

            player = new Player
            {
                Username = (name ?? "Unknown").Trim().ToLower(),
                AvatarImageName = "🦊"
            };
            player.AuthOAuths.Add(new AuthOAuth
            {
                Provider = "Google",
                ProviderUserId = googleId,
                Email = (email ?? "").Trim().ToLower()
            });

            _db.Players.Add(player);
            await _db.SaveChangesAsync();
            return player;
        }

        #endregion

        #region Player & User Helpers

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return null;
            return userId;
        }

        private async Task<Player?> GetPlayerByIdWithAuthAsync(int playerId)
        {
            return await _db.Players
                .Include(p => p.AuthLocal)
                .Include(p => p.AuthOAuths)
                .FirstOrDefaultAsync(p => p.Id == playerId);
        }

        private async Task<Player?> GetPlayerByEmailAsync(string email)
        {
            email = email.Trim().ToLower();

            var playerByLocal = await _db.Players
                .Include(p => p.AuthLocal)
                .Include(p => p.AuthOAuths)
                .Where(p => p.AuthLocal != null && p.AuthLocal.Email == email)
                .FirstOrDefaultAsync();

            if (playerByLocal != null)
                return playerByLocal;

            var playerByOAuth = await _db.Players
                .Include(p => p.AuthLocal)
                .Include(p => p.AuthOAuths.Where(a => a.Email == email))
                .FirstOrDefaultAsync(p => p.AuthOAuths.Any(a => a.Email == email));

            return playerByOAuth;
        }

        private static string? GetPlayerEmail(Player player)
        {
            return player.AuthLocal?.Email
                ?? player.AuthOAuths?.FirstOrDefault(a => a.Provider == "Google")?.Email;
        }

        private bool UpdateIfChanged(ref string currentValue, string? newValue)
        {
            if (string.IsNullOrWhiteSpace(newValue))
                return false;

            var normalized = newValue.Trim().ToLower();
            if (currentValue == normalized)
                return false;

            currentValue = normalized;
            return true;
        }

        private async Task<(bool status, string? error)> UpdateEmailAsync(Player player, string? newEmail)
        {
            if (string.IsNullOrWhiteSpace(newEmail))
                return (false, null);

            newEmail = newEmail.Trim().ToLower();

            var existingPlayer = await GetPlayerByEmailAsync(newEmail);
            if (existingPlayer != null && existingPlayer.Id != player.Id)
                return (false, "Email is already in use by another account");

            if (player.AuthLocal != null)
            {
                var email = player.AuthLocal.Email;
                var changed = UpdateIfChanged(ref email, newEmail);
                player.AuthLocal.Email = email;
                return (changed, null);
            }

            var currentEmail = GetPlayerEmail(player);
            var activeGoogleOAuth = player.AuthOAuths
                .FirstOrDefault(a => a.Provider == "Google" && a.Email == currentEmail);

         	if (activeGoogleOAuth != null)
            {
                return (false, "Google-registered users cannot modify their email.");
            }


            return (false, null);
        }

        private (bool status, string? error) UpdatePassword(Player player, string? password)
        {
            if (string.IsNullOrWhiteSpace(password))
                return (false, null);

            if (player.AuthLocal == null)
                return (false, "Can't update password for OAuth user");
            
            if (player.AuthLocal.PasswordHash == null)
                return (false, "Password hash missing, cannot update password");
            
            var hasher = new PasswordHasher<AuthLocal>();
            var verificationResult = hasher.VerifyHashedPassword(player.AuthLocal, player.AuthLocal.PasswordHash!, password);
            if (verificationResult == PasswordVerificationResult.Success)
                return (false, "New password must be different from the current password");

            player.AuthLocal.PasswordHash = hasher.HashPassword(player.AuthLocal, password);
            return (true, null);
        }

        /// Enqueue a welcome email for background delivery.
        private void EnqueueWelcomeEmail(string email)
        {
            _emailQueue.Enqueue(new EmailMessage
            {
                To = email,
                Subject = "Welcome to Andary",
                Body =
                    "Hello,\n\n" +
                    "Thank you for signing up with Andary. " +
                    "We are happy to have you join our website!\n\n" +
                    "If you did not sign up, you can safely ignore this email.\n\n" +
                    "Best regards,\n" +
                    "The Andary Team"
            });
        }

        /// Enqueue a password-reset email for background delivery.
        private void EnqueueResetEmail(Player player, string token)
        {
            var resetLink = $"{Environment.GetEnvironmentVariable("FRONTEND_URL")}/reset-password?token={Uri.EscapeDataString(token)}";

            _emailQueue.Enqueue(new EmailMessage
            {
                To = player.AuthLocal!.Email!,
                Subject = "Password Reset Request",
                Body =
                    $"Hello {player.Username},\n\n" +
                    "We received a request to reset your password. " +
                    "You can reset your password by clicking the link below:\n\n" +
                    $"{resetLink}\n\n" +
                    "If you did not request a password reset, you can safely ignore this email.\n\n" +
                    "Best regards,\n" +
                    "The Andary Team"
            });
        }

        #endregion
    }
}
