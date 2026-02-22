using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class AuthLocal
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public int PlayerId { get; set; }
        public Player Player { get; set; } = null!;
        [Required]
        [EmailAddress]
        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;
        [Required]
        [MinLength(8)]
        [MaxLength(255)]
        public string PasswordHash { get; set; } = string.Empty;
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [Required]
        public bool IsVerified { get; set; } = false;

        // Email Verification
        [MaxLength(255)]
        public string? EmailVerificationTokenHash { get; set; }
        public DateTime? EmailVerificationTokenExpiresAt { get; set; }
    }
}