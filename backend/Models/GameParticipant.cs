using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace Backend.Models
{
    public class GameParticipant
    {
        [Key]
        public int Id { get; set; }
        [Required]
        [ForeignKey("GameSession")]
        public int GameSessionId { get; set; }
        public GameSession GameSession { get; set; } = null!;

        [Required]
        [ForeignKey("Player")]
        public int PlayerId { get; set; }
        public Player Player { get; set; } = null!;

        [Required]
        public int FinalScore { get; set; } = 0;
        [Required]
        public int FinalRank { get; set; } = 0;
    }
}