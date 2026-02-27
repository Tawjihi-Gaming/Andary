using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace Backend.Models
{
    public class Player
    {
        [Key]
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;
        public int Xp { get; set; } = 0;
		[Required]
        [MaxLength(100)]
        public string AvatarImageName { get; set; } = string.Empty;
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }
        public AuthLocal? AuthLocal { get; set; } 
        public ICollection<AuthOAuth> AuthOAuths { get; set; } = new List<AuthOAuth>();
        public ICollection<GameParticipant> GameParticipants { get; set; } = new List<GameParticipant>();
        public ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();
        public ICollection<FriendRequest> SentRequests { get; set; } = new List<FriendRequest>();
        public ICollection<FriendRequest> ReceivedRequests { get; set; } = new List<FriendRequest>();
        public ICollection<Friend> Friendships { get; set; } = new List<Friend>();
    }
}
