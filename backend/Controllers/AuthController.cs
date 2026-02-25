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
using Microsoft.AspNetCore.Authorization;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

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

        public AuthController(AppDbContext db, GoogleOAuthConfig googleConfig, HttpClient httpClient)
        {
            _db = db;
            _googleConfig = googleConfig;
            _httpClient = httpClient;
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
                xp = player.Xp
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

            await using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                _db.Players.Add(player);
                await _db.SaveChangesAsync();

                await SendWelcomeEmailAsync(authLocal.Email);

                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                return StatusCode((int)HttpStatusCode.InternalServerError,
                    new { msg = "Could not complete signup flow" });
            }

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
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173";
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

                var authResult = await SetAuthCookiesAsync(player);
                if ((authResult as ObjectResult)?.StatusCode >= 400)
                {
                    return Redirect($"{frontendUrl}/login?error=auth-failed");
                }
                return Redirect($"{frontendUrl}/lobby?login=oauth");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Google callback EXCEPTION: {ex}");
                return Redirect($"{frontendUrl}/login?error=server-error");
            }
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
    }
}