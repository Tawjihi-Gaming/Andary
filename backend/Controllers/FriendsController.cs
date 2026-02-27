using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using Backend.Services;
using Backend.Models.DTOs;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/friends")]
    [Authorize]
    public class FriendsController : ControllerBase
    {
        private readonly FriendService _friendService;

        public FriendsController(FriendService friendService)
        {
            _friendService = friendService;
        }

        // POST api/friends/requests
        [HttpPost("requests")]
        public async Task<IActionResult> SendRequest([FromBody] SendFriendRequestDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var (result, status, error) = await _friendService.SendRequestAsync(userId.Value, dto.ReceiverId);

            return status switch
            {
                201 => StatusCode(201, result),
                _ => StatusCode(status, new { msg = error })
            };
        }

        // DELETE api/friends/requests/{receiverId}
        [HttpDelete("requests/{receiverId}")]
        public async Task<IActionResult> CancelRequest(int receiverId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var (status, error) = await _friendService.CancelRequestAsync(userId.Value, receiverId);

            return status == 200
                ? Ok(new { msg = "Friend request canceled" })
                : StatusCode(status, new { msg = error });
        }

        // GET api/friends/requests/incoming
        [HttpGet("requests/incoming")]
        public async Task<IActionResult> GetIncomingRequests()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var requests = await _friendService.GetIncomingRequestsAsync(userId.Value);
            return Ok(requests);
        }

        // GET api/friends/requests/sent
        [HttpGet("requests/sent")]
        public async Task<IActionResult> GetSentRequests()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var requests = await _friendService.GetSentRequestsAsync(userId.Value);
            return Ok(requests);
        }

        // POST api/friends/requests/{requestId}/accept
        [HttpPost("requests/{requestId}/accept")]
        public async Task<IActionResult> AcceptRequest(int requestId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var (result, status, error) = await _friendService.AcceptRequestAsync(requestId, userId.Value);

            return status switch
            {
                200 => Ok(result),
                _ => StatusCode(status, new { msg = error })
            };
        }

        // POST api/friends/requests/{requestId}/reject
        [HttpPost("requests/{requestId}/reject")]
        public async Task<IActionResult> RejectRequest(int requestId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var (status, error) = await _friendService.RejectRequestAsync(requestId, userId.Value);

            return status == 200
                ? Ok(new { msg = "Friend request rejected" })
                : StatusCode(status, new { msg = error });
        }

        // GET api/friends
        [HttpGet]
        public async Task<IActionResult> GetFriends()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var friends = await _friendService.GetFriendsAsync(userId.Value);
            return Ok(friends);
        }

        // DELETE api/friends/{friendId}
        [HttpDelete("{friendId}")]
        public async Task<IActionResult> RemoveFriend(int friendId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { msg = "Invalid token" });

            var (status, error) = await _friendService.RemoveFriendAsync(friendId, userId.Value);

            return status == 200
                ? Ok(new { msg = "Friend removed" })
                : StatusCode(status, new { msg = error });
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return null;
            return userId;
        }
    }
}
