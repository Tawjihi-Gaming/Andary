using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class AuthOAuth
    {
        [Key]
        public int Id { get; set; }
        [Required]
        [ForeignKey("Player")]
        public int PlayerId { get; set; }
        public Player Player { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string Provider { get; set; } = string.Empty;          
        [Required]
        [MaxLength(100)]
        public string ProviderUserId { get; set; } = string.Empty;  
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}