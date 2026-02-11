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
        [MaxLength(100)]
        public int? Xp { get; set; } = 0;
        [MaxLength(100)]
        public string? AvatarImageName { get; set; }
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? RefreshToken { get; set; } = string.Empty;
        public DateTime? RefreshTokenExpiryTime { get; set; }
        public AuthLocal AuthLocal { get; set; } = null!;
        public ICollection<AuthOAuth> AuthOAuths { get; set; } = new List<AuthOAuth>();
        public ICollection<GameParticipant> GameParticipants { get; set; } = new List<GameParticipant>();
    }
}
