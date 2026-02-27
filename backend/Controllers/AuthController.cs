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
using Backend.Models.DTOs;
using System.Net;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public partial class AuthController : ControllerBase
    {
        #region Fields & Constructor
        private readonly AppDbContext _db;
        private readonly GoogleOAuthConfig _googleConfig;
        private readonly HttpClient _httpClient;
        private readonly IEmailQueue _emailQueue;

        public AuthController(AppDbContext db, GoogleOAuthConfig googleConfig, HttpClient httpClient, IEmailQueue emailQueue)
        {
            _db = db;
            _googleConfig = googleConfig;
            _httpClient = httpClient;
            _emailQueue = emailQueue;
        }
        #endregion

        #region Refresh Token Endpoint

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (string.IsNullOrWhiteSpace(refreshToken))
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
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var player = await GetPlayerByIdWithAuthAsync(userId.Value);
            if (player == null)
                return NotFound(new { msg = "Player not found" });

            return Ok(new
            {
                id = player.Id,
                username = player.Username,
                email = GetPlayerEmail(player),
                avatarImageName = player.AvatarImageName,
                xp = player.Xp,
                isGoogleUser = player.AuthOAuths?.Any(a => a.Provider == "Google") == true
            });
        }

        #endregion

        #region Local Auth Endpoints

        [HttpPost("signup")]
        public async Task<IActionResult> SignUp(PlayerSignupDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            dto.Email = dto.Email!.Trim().ToLower();
            dto.Username = dto.Username!.Trim().ToLower();
            dto.AvatarImageName = dto.AvatarImageName!.Trim().ToLower();

            var existingPlayer = await GetPlayerByEmailAsync(dto.Email);
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

            // Enqueue welcome email — HTTP response returns immediately.
            EnqueueWelcomeEmail(authLocal.Email);

            return Ok(new { msg = "Player created. Welcome email sent to email address." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(PlayerLoginDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            dto.Email = dto.Email!.Trim().ToLower();

            var player = await _db.Players.Include(p => p.AuthLocal)
                .FirstOrDefaultAsync(p => p.AuthLocal != null && p.AuthLocal.Email == dto.Email);
            if (player == null || player.AuthLocal == null)
                return BadRequest(new { msg = "Invalid email or password" });

            var passwordHasher = new PasswordHasher<AuthLocal>();
            var result = passwordHasher.VerifyHashedPassword(
                    player.AuthLocal, player.AuthLocal.PasswordHash!, dto.Password);

            if (result == PasswordVerificationResult.Failed)
                return BadRequest(new { msg = "Invalid email or password" });

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
            var frontendUrl = (Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173").TrimEnd('/');
            try
            {
                if (string.IsNullOrWhiteSpace(code))
                    return Redirect($"{frontendUrl}/login?error=no-code");

                var tokenResponse = await ExchangeCodeForGoogleTokenAsync(code);
                if (tokenResponse == null || string.IsNullOrWhiteSpace(tokenResponse.id_token))
                    return Redirect($"{frontendUrl}/login?error=token-failed");

                var (email, name, googleId) = await ParseGoogleIdToken(tokenResponse.id_token);
                if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(googleId))
                    return Redirect($"{frontendUrl}/login?error=invalid-token");

                var player = await GetOrCreateGooglePlayerAsync(googleId, name, email);

                // Generate a short-lived one-time code instead of setting cookies
                // during the redirect (cookies set on redirects are often blocked
                // cross-domain by modern browsers).
                var oauthCode = GenerateOAuthCode(player.Id);
                var encodedCode = Uri.EscapeDataString(oauthCode);
                return Redirect($"{frontendUrl}/lobby?login=oauth&code={encodedCode}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Google callback EXCEPTION: {ex}");
                return Redirect($"{frontendUrl}/login?error=server-error");
            }
        }

        [HttpPost("exchange-code")]
        public async Task<IActionResult> ExchangeOAuthCode([FromBody] OAuthCodeDto dto)
        {
            var playerId = ValidateAndConsumeOAuthCode(dto.Code);
            if (playerId == null)
                return BadRequest(new { msg = "Invalid or expired code" });

            var player = await _db.Players
                .Include(p => p.AuthLocal)
                .Include(p => p.AuthOAuths)
                .FirstOrDefaultAsync(p => p.Id == playerId.Value);
            if (player == null)
                return NotFound(new { msg = "Player not found" });

            return await SetAuthCookiesAsync(player);
        }
        #endregion

        #region Logout Endpoint

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var player = await _db.Players.FirstOrDefaultAsync(p => p.Id == userId.Value);
            if (player == null)
                return NotFound(new { msg = "Player not found" });

            player.RefreshToken = null;
            player.RefreshTokenExpiryTime = null;
            await _db.SaveChangesAsync();

            Response.Cookies.Delete("jwt", BuildAuthCookieOptions(DateTime.UtcNow.AddDays(-1)));
            Response.Cookies.Delete("refreshToken", BuildAuthCookieOptions(DateTime.UtcNow.AddDays(-1)));

            return Ok(new { msg = "Logged out" });
        }

        #endregion

        #region Edit Player Info Endpoint

        // Frontend: On 401 response, attempt token refresh before redirecting to login
        [HttpPost("edit")]
        [Authorize]
        public async Task<IActionResult> EditPlayerInfo(PlayerEditDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var player = await GetPlayerByIdWithAuthAsync(userId.Value);
            if (player == null)
                return NotFound(new { msg = "Player not found" });

            bool hasChanges = false;
            var username = player.Username;
            hasChanges |= UpdateIfChanged(ref username, dto.Username);
            player.Username = username;

            var avatar = player.AvatarImageName;
            hasChanges |= UpdateIfChanged(ref avatar, dto.AvatarImageName);
            player.AvatarImageName = avatar;
            
            var emailUpdateResult = await UpdateEmailAsync(player, dto.Email);
            if (!emailUpdateResult.status && emailUpdateResult.error != null)
                return BadRequest(new { msg = emailUpdateResult.error });
            hasChanges |= emailUpdateResult.status;
            
            var passwordUpdateResult = UpdatePassword(player, dto.Password);
            if (!passwordUpdateResult.status && passwordUpdateResult.error != null)
                return BadRequest(new { msg = passwordUpdateResult.error });
            hasChanges |= passwordUpdateResult.status;

            if (hasChanges)
                await _db.SaveChangesAsync();

            return Ok(new { msg = "Player info updated" });
        }
        #endregion

        #region Forgot Password and Reset Password Endpoint
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var email = dto.Email.Trim().ToLower();

            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { msg = "Email is required" });

            var player = await GetPlayerByEmailAsync(email);
            if (player == null || player.AuthLocal == null)
                return Ok(new { msg = "If an account with that email exists, a reset link has been sent" });

            var oldTokens = _db.PasswordResetTokens
                .Where(t => t.PlayerId == player.Id && !t.IsUsed);
            _db.PasswordResetTokens.RemoveRange(oldTokens);
            
            var rawToken = GenerateToken();
            var resetToken = new PasswordResetToken
            {
                PlayerId = player.Id,
                TokenHash = HashToken(rawToken),
                ExpiryDate = DateTime.UtcNow.AddMinutes(30)
            };
            _db.PasswordResetTokens.Add(resetToken);
            await _db.SaveChangesAsync();

            // Enqueue reset email — HTTP response returns immediately.
            EnqueueResetEmail(player, rawToken);
            return Ok(new { msg = "If an account with that email exists, a reset link has been sent" });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var hashedToken = HashToken(dto.Token);
            var resetToken = await _db.PasswordResetTokens
                .Include(t => t.Player)
                .ThenInclude(p => p.AuthLocal)
                .FirstOrDefaultAsync(t => t.TokenHash == hashedToken && !t.IsUsed);
            if (resetToken == null || resetToken.ExpiryDate < DateTime.UtcNow)
                return BadRequest(new { msg = "Invalid or expired token" });

            var (success, error) = UpdatePassword(resetToken.Player, dto.NewPassword);
            if (!success)
                return BadRequest(new { msg = error });
            resetToken.IsUsed = true;
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { msg = "Could not reset password", detail = ex.Message });
            }

            return Ok(new { msg = "Password has been reset" });
        }
        #endregion
    }
}