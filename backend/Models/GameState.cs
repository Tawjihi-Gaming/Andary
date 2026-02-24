//Pure data. No behavior.
//This lets you:
// - Track whether you’re collecting fake answers
// - Or waiting for choices
// - Or showing ranking

using Backend.Enums;
using Backend.Models;
using System.Collections.Generic;

namespace Backend.Models
{
    public class GameState
    {
        public string RoomId { get; set; } = "";
        public GamePhase Phase { get; set; }
        public int CurrentQuestionIndex { get; set; }
        public int TotalQuestions { get; set; }
        public Question? CurrentQuestion { get; set; }
        public List<SessionPlayer> Players { get; set; } = new();
        public List<string> Choices { get; set; } = new();
        public string? RoomCode { get; set; } // for private rooms
        public List<string> SelectedTopics { get; set; } = new(); // all topics chosen for this game
        public string? CurrentRoundTopic { get; set; } // topic for the current question
        public string? TopicChooserName { get; set; } // name of the player choosing the next topic
        public string? CurrentPlayerSessionId { get; set; } // sessionId of player whose turn it is (topic chooser when in ChoosingRoundTopic)
        public bool NeedsTopicChoice { get; set; } // true if multiple topics and player must choose
        public int AnswerTimeSeconds { get; set; } // server-authoritative per-phase answer timer
        public DateTime? PhaseDeadlineUtc { get; set; } // absolute UTC deadline for current timed phase
    }
}
