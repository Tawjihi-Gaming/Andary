using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace Backend.Models
{
    public class GameSession
    {
        [Key]
        public int Id { get; set; }
        public DateTime? FinishedAt { get; set; }
        [Required]
        public int TotalRounds { get; set; } = 0;
        [Required]
        public string GameConfigSnapshot { get; set; } = string.Empty;
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<GameParticipant> GameParticipants { get; set; } = new List<GameParticipant>();
    }  
}