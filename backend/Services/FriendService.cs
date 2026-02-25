using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class FriendService
    {
        private readonly AppDbContext _db;

        public FriendService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<(FriendRequestDto? Result, int StatusCode, string? Error)> SendRequestAsync(int senderId, int receiverId)
        {
            if (senderId == receiverId)
                return (null, 400, "Cannot send a friend request to yourself");

            var receiverExists = await _db.Players.AnyAsync(p => p.Id == receiverId);
            if (!receiverExists)
                return (null, 404, "Player not found");

            // Check if already friends
            if (await AreFriendsAsync(senderId, receiverId))
                return (null, 409, "Already friends");

            // Check for existing pending request in the same direction
            var existing = await _db.FriendRequests
                .FirstOrDefaultAsync(fr => fr.SenderId == senderId && fr.ReceiverId == receiverId && fr.Status == "pending");
            if (existing != null)
                return (null, 409, "Friend request already sent");

            // Check for reverse pending request — auto-accept
            var reverse = await _db.FriendRequests
                .Include(fr => fr.Sender)
                .Include(fr => fr.Receiver)
                .FirstOrDefaultAsync(fr => fr.SenderId == receiverId && fr.ReceiverId == senderId && fr.Status == "pending");

            if (reverse != null)
            {
                reverse.Status = "accepted";
                reverse.RespondedAt = DateTime.UtcNow;
                await CreateFriendshipAsync(senderId, receiverId);
                await _db.SaveChangesAsync();

                return (MapFriendRequest(reverse), 201, null);
            }

            var request = new FriendRequest
            {
                SenderId = senderId,
                ReceiverId = receiverId
            };
            _db.FriendRequests.Add(request);
            await _db.SaveChangesAsync();

            // Reload with navigation properties
            await _db.Entry(request).Reference(r => r.Sender).LoadAsync();
            await _db.Entry(request).Reference(r => r.Receiver).LoadAsync();

            return (MapFriendRequest(request), 201, null);
        }

        public async Task<(int StatusCode, string? Error)> CancelRequestAsync(int senderId, int receiverId)
        {
            var request = await _db.FriendRequests
                .FirstOrDefaultAsync(fr => fr.SenderId == senderId && fr.ReceiverId == receiverId && fr.Status == "pending");

            if (request == null)
                return (404, "Pending request not found");

            _db.FriendRequests.Remove(request);
            await _db.SaveChangesAsync();

            return (200, null);
        }

        public async Task<List<FriendRequestDto>> GetIncomingRequestsAsync(int playerId)
        {
            return await _db.FriendRequests
                .Where(fr => fr.ReceiverId == playerId && fr.Status == "pending")
                .Include(fr => fr.Sender)
                .Include(fr => fr.Receiver)
                .OrderByDescending(fr => fr.CreatedAt)
                .Select(fr => MapFriendRequest(fr))
                .ToListAsync();
        }

        public async Task<List<FriendRequestDto>> GetSentRequestsAsync(int playerId)
        {
            return await _db.FriendRequests
                .Where(fr => fr.SenderId == playerId && fr.Status == "pending")
                .Include(fr => fr.Sender)
                .Include(fr => fr.Receiver)
                .OrderByDescending(fr => fr.CreatedAt)
                .Select(fr => MapFriendRequest(fr))
                .ToListAsync();
        }

        public async Task<(FriendDto? Result, int StatusCode, string? Error)> AcceptRequestAsync(int requestId, int currentUserId)
        {
            var request = await _db.FriendRequests
                .Include(fr => fr.Sender)
                .Include(fr => fr.Receiver)
                .FirstOrDefaultAsync(fr => fr.Id == requestId);

            if (request == null)
                return (null, 404, "Friend request not found");

            if (request.ReceiverId != currentUserId)
                return (null, 403, "Only the receiver can accept this request");

            if (request.Status != "pending")
                return (null, 400, "Request is no longer pending");

            if (await AreFriendsAsync(request.SenderId, request.ReceiverId))
            {
                _db.FriendRequests.Remove(request);
                await _db.SaveChangesAsync();
                return (null, 409, "Already friends");
            }

            request.Status = "accepted";
            request.RespondedAt = DateTime.UtcNow;

            var friendship = await CreateFriendshipAsync(request.SenderId, request.ReceiverId);
            await _db.SaveChangesAsync();

            var otherPlayer = request.SenderId == currentUserId ? request.Receiver : request.Sender;

            var dto = new FriendDto
            {
                FriendshipId = friendship.Id,
                Player = MapPlayer(otherPlayer),
                Since = friendship.CreatedAt
            };

            return (dto, 200, null);
        }

        public async Task<(int StatusCode, string? Error)> RejectRequestAsync(int requestId, int currentUserId)
        {
            var request = await _db.FriendRequests.FindAsync(requestId);

            if (request == null)
                return (404, "Friend request not found");

            if (request.ReceiverId != currentUserId)
                return (403, "Only the receiver can reject this request");

            if (request.Status != "pending")
                return (400, "Request is no longer pending");

            request.Status = "rejected";
            request.RespondedAt = DateTime.UtcNow;
            _db.FriendRequests.Remove(request);
            await _db.SaveChangesAsync();

            return (200, null);
        }

        public async Task<List<FriendDto>> GetFriendsAsync(int playerId)
        {
            var friendships = await _db.Friends
                .Where(f => f.Player1Id == playerId || f.Player2Id == playerId)
                .Include(f => f.Player1)
                .Include(f => f.Player2)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

            return friendships.Select(f =>
            {
                var other = f.Player1Id == playerId ? f.Player2 : f.Player1;
                return new FriendDto
                {
                    FriendshipId = f.Id,
                    Player = MapPlayer(other),
                    Since = f.CreatedAt
                };
            }).ToList();
        }

        public async Task<(int StatusCode, string? Error)> RemoveFriendAsync(int friendshipId, int currentUserId)
        {
            var friendship = await _db.Friends.FindAsync(friendshipId);

            if (friendship == null)
                return (404, "Friendship not found");

            if (friendship.Player1Id != currentUserId && friendship.Player2Id != currentUserId)
                return (403, "You can only remove your own friendships");

            _db.Friends.Remove(friendship);
            await _db.SaveChangesAsync();

            return (200, null);
        }

        // Helpers

        private async Task<bool> AreFriendsAsync(int playerA, int playerB)
        {
            var (p1, p2) = OrderPair(playerA, playerB);
            return await _db.Friends.AnyAsync(f => f.Player1Id == p1 && f.Player2Id == p2);
        }

        private async Task<Friend> CreateFriendshipAsync(int playerA, int playerB)
        {
            var (p1, p2) = OrderPair(playerA, playerB);
            var friendship = new Friend { Player1Id = p1, Player2Id = p2 };
            _db.Friends.Add(friendship);
            return friendship;
        }

        private static (int, int) OrderPair(int a, int b) => a < b ? (a, b) : (b, a);

        private static FriendRequestDto MapFriendRequest(FriendRequest fr) => new()
        {
            Id = fr.Id,
            Sender = MapPlayer(fr.Sender),
            Receiver = MapPlayer(fr.Receiver),
            Status = fr.Status,
            CreatedAt = fr.CreatedAt
        };

        private static PlayerBasicDto MapPlayer(Player p) => new()
        {
            Id = p.Id,
            Username = p.Username,
            AvatarImageName = p.AvatarImageName
        };
    }
}
