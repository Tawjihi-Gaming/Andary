//Pure data. No behavior.
//This lets you:
// - Track whether you’re collecting fake answers
// - Or waiting for choices
// - Or showing ranking

using backend.Enums;
using backend.Models;
using System.Collections.Generic;

namespace backend.Models
{
    public class GameState
    {
        public string RoomId { get; set; }
        public GamePhase Phase { get; set; }
        public int CurrentQuestionIndex { get; set; }
        public int TotalQuestions { get; set; }
        public Question? CurrentQuestion { get; set; }
        public List<Player> Players { get; set; } = new();
        public List<string> Choices { get; set; } = new();
        public string? RoomCode { get; set; } // for private rooms
        public string? SelectedTopic { get; set; }
    }
}
