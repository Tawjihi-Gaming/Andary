using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace Backend.Models
{
    public class PasswordResetToken
    {
        [Key]
        public int Id { get; set; }
        [Required]
        [MaxLength(88)]
        public required string TokenHash  { get; set; }
        [Required]
        public DateTime ExpiryDate { get; set; }

        [Required]
        public bool IsUsed { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [Required]
        public int PlayerId { get; set; }
        public Player Player { get; set; } = null!;
    }
}
