using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using Backend.Models.Configs;
using Backend.Models.DTOs;
using System.Text.Json;
using System.Net;
using System.Security.Cryptography;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        #region Fields & Constructor
        private readonly AppDbContext _db;
        private readonly GoogleOAuthConfig _googleConfig;

        public AuthController(AppDbContext db, GoogleOAuthConfig googleConfig)
        {
            _db = db;
            _googleConfig = googleConfig;
        }
        #endregion

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

        private string GenerateRefreshToken()
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
            var isDev = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";

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
            if (string.IsNullOrEmpty(token))
                return;
            Response.Cookies.Append("jwt", token, BuildAuthCookieOptions(DateTime.UtcNow.AddHours(1)));
        }

        private void SetRefreshToken(Player player)
        {
            if (player == null) return;

            var refreshToken = GenerateRefreshToken();

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

            var email = player.AuthLocal?.Email
                ?? player.AuthOAuths?.FirstOrDefault(a => a.Provider == "Google")?.Email;

            return Ok(new { msg = "Authentication successful", Id = player.Id, Username = player.Username, AvatarImageName = player.AvatarImageName, Email = email });
        }

        #endregion

        #region Google OAuth Helpers

         private Dictionary<string, string> BuildGoogleTokenRequestBody(string code)
        {
            if (_googleConfig?.web == null || string.IsNullOrEmpty(code))
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

            using var httpClient = new HttpClient();
            var requestContent = new FormUrlEncodedContent(body);
            var response = await httpClient.PostAsync(_googleConfig.web?.token_uri ?? "", requestContent);
            if (!response.IsSuccessStatusCode)
                return null;

            var responseContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<GoogleTokenResponse>(responseContent);
        }

        private async Task<IEnumerable<SecurityKey>> GetGoogleSigningKeysAsync()
        {
            using var httpClient = new HttpClient();
			var response = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/certs");
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
            if (string.IsNullOrEmpty(idToken))
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

            player = new Player { Username = name ?? "Unknown", AvatarImageName = "👤" };
            player.AuthOAuths.Add(new AuthOAuth { Provider = "Google", ProviderUserId = googleId, Email = email });

            _db.Players.Add(player);
            await _db.SaveChangesAsync();
            return player;
        }

        #endregion

        #region Refresh Token Endpoint

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (string.IsNullOrEmpty(refreshToken))
                return BadRequest(new { msg = "No refresh token provided" });

            var hashedToken = HashToken(refreshToken);
            var player = await _db.Players
                .FirstOrDefaultAsync(p => p.RefreshToken == hashedToken);
            if (player == null || player.RefreshTokenExpiryTime <= DateTime.UtcNow)
                return BadRequest(new { msg = "Invalid or expired refresh token" });

            var newJwtToken = GenerateJwtToken(player);
            SetJwtCookie(newJwtToken);
            if (player.RefreshTokenExpiryTime < DateTime.UtcNow.AddDays(1))
            {
                SetRefreshToken(player);
                await _db.SaveChangesAsync();
            }
            return Ok(new { msg = "Token refreshed" });
        }

        [HttpGet("me")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { msg = "Invalid token" });

            var player = await _db.Players
                .Include(p => p.AuthLocal)
                .Include(p => p.AuthOAuths)
                .FirstOrDefaultAsync(p => p.Id == userId);
            if (player == null)
                return NotFound(new { msg = "Player not found" });

            var email = player.AuthLocal?.Email
                ?? player.AuthOAuths?.FirstOrDefault(a => a.Provider == "Google")?.Email;

            return Ok(new
            {
                id = player.Id,
                username = player.Username,
                email,
                avatarImageName = player.AvatarImageName,
                xp = player.Xp
            });
        }

        #endregion

        #region Local Auth Endpoints

        [HttpPost("signup")]
        public async Task<IActionResult> SignUp(PlayerSignupDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.Email)
                || string.IsNullOrEmpty(dto.Username)
                || string.IsNullOrEmpty(dto.Password)
				|| string.IsNullOrEmpty(dto.AvatarImageName))
                return BadRequest(new { msg = "Invalid signup data" });

            var existingPlayer = await _db.Players.Include(p => p.AuthLocal)
                .FirstOrDefaultAsync(p => p.AuthLocal != null && p.AuthLocal.Email == dto.Email);
            if (existingPlayer != null)
                return BadRequest(new { msg = "Email already used" });

            var authLocal = new AuthLocal
			{
				Email = dto.Email
			};

			var hasher = new PasswordHasher<AuthLocal>();
			authLocal.PasswordHash = hasher.HashPassword(authLocal, dto.Password);

			var player = new Player
			{
				Username = dto.Username,
				AuthLocal = authLocal,
				AvatarImageName = dto.AvatarImageName
			};

            _db.Players.Add(player);
            await _db.SaveChangesAsync();

            return Ok(new { msg = "Player created" });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(PlayerLoginDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.Email) || string.IsNullOrEmpty(dto.Password))
                return BadRequest(new { msg = "Invalid login data" });

            var player = await _db.Players.Include(p => p.AuthLocal)
                .FirstOrDefaultAsync(p => p.AuthLocal != null && p.AuthLocal.Email == dto.Email);
            if (player == null || player.AuthLocal == null)
                return BadRequest(new { msg = "Invalid email" });

            var passwordHasher = new PasswordHasher<AuthLocal>();
            var result = passwordHasher.VerifyHashedPassword(
                    player.AuthLocal, player.AuthLocal.PasswordHash!, dto.Password);

            if (result == PasswordVerificationResult.Failed)
                return BadRequest(new { msg = "Invalid password" });

            return await SetAuthCookiesAsync(player);
        }

        #endregion

        #region Google Endpoints

        [HttpGet("google-login")]
        public IActionResult GoogleLogin()
        {
            if (_googleConfig?.web == null)
                return BadRequest(new { msg = "Google configuration missing" });

            var clientId = _googleConfig.web.client_id ?? "";
            var redirectUri = _googleConfig.web.redirect_uris?.FirstOrDefault() ?? "";
            var scope = "openid email profile";
            var authUrl = $"{_googleConfig.web.auth_uri}?client_id={clientId}&redirect_uri={redirectUri}&response_type=code&scope={scope}";
            return Ok(new { url = authUrl });
        }

        [HttpGet("google/callback")]
        public async Task<IActionResult> GoogleCallback(string code)
        {
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173";
            try
            {
                if (string.IsNullOrEmpty(code))
                    return Redirect($"{frontendUrl}/login?error=no-code");

                Console.WriteLine("Step 1: Exchanging code for token...");
                var tokenResponse = await ExchangeCodeForGoogleTokenAsync(code);
                if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.id_token))
                    return Redirect($"{frontendUrl}/login?error=token-failed");

                Console.WriteLine("Step 2: Parsing ID token...");
                var (email, name, googleId) = await ParseGoogleIdToken(tokenResponse.id_token);
                Console.WriteLine($"Step 2 result: email={email}, name={name}, googleId={googleId}");
                if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(googleId))
                    return Redirect($"{frontendUrl}/login?error=invalid-token");

                Console.WriteLine("Step 3: Getting or creating player...");
                var player = await GetOrCreateGooglePlayerAsync(googleId, name, email);
                Console.WriteLine($"Step 3 result: playerId={player.Id}");

                Console.WriteLine("Step 4: Setting auth cookies...");
                var authResult = await SetAuthCookiesAsync(player);
                if ((authResult as ObjectResult)?.StatusCode >= 400)
                {
                    return Redirect($"{frontendUrl}/login?error=auth-failed");
                }
                Console.WriteLine("Step 5: Redirecting to lobby");
                return Redirect($"{frontendUrl}/lobby");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Google callback EXCEPTION: {ex}");
                return Redirect($"{frontendUrl}/login?error=server-error");
            }
        }
        #endregion
    }
}
