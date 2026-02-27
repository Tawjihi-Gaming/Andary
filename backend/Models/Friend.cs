using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("friends")]
    public class Friend
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int Player1Id { get; set; }

        [Required]
        public int Player2Id { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(Player1Id))]
        public Player Player1 { get; set; } = null!;

        [ForeignKey(nameof(Player2Id))]
        public Player Player2 { get; set; } = null!;
    }
}
