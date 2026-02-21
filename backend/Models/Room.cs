//Pure data. No behavior.

using Backend.Enums;

namespace Backend.Models;

public class Room
{
    public const int MaxPlayers = 6;
    public const int MinPlayers = 2;

    public string RoomId { get; set; } = "";

    // Human-readable room name (e.g. "Ali's Room")
    public string Name { get; set; } = "";

    //this value can be only public or private
    //the enum i defined earlier
    public RoomType Type { get; set; }

    //The ? means: nullable (“This value is allowed to be null.”)
    //Because:
    // - Public rooms don’t have a code
    // - Private rooms have a code
    public string? Code { get; set; }

    public GamePhase Phase { get; set; } = GamePhase.Lobby;

    // SessionId of the player who created this room.
    // Only the owner can start the game.
    public string OwnerSessionId { get; set; } = "";

    // Topics selected by players during lobby (min 1, max 7)
    public List<string> SelectedTopics { get; set; } = new();

    // The topic for the current round's question
    public string? CurrentRoundTopic { get; set; }

    // Index into Players list — which player chooses the topic for the next round
    // Rotates after each round so every player gets a turn
    public int TopicChooserIndex { get; set; }

    public int TotalQuestions { get; set; }
    public int CurrentQuestionIndex { get; set; }

    //A List is:
    //A collection of items in order.
    //So this holds:
    //player 1, player 2, .....
    //With = new();, the list is ready to use.
    // Uses SessionPlayer (in-memory) instead of Player (DB) because
    // game participants are temporary — they only exist during the session.
    public List<SessionPlayer> Players { get; set; } = new();

    public List<Question> Questions { get; set; } = new();
    public Question? CurrentQuestion { get; set; }

    //What a Dictionary is
    //key → value
    //Key   = PlayerId or ConnectionId
    //Value = Fake answer text
    //With Dictionary:
    //Same key twice → overwrites
    //Easy to check if player already submitted
    public Dictionary<string, string> FakeAnswers { get; set; } = new();
    public Dictionary<string, string> ChosenAnswers { get; set; } = new();

    // Track used question IDs so a topic choice never reuses a previously shown question.
    public HashSet<int> UsedQuestionIds { get; set; } = new();
}
