//Pure data. No behavior.

using backend.Enums;

namespace backend.Models;

public class Room
{
    public string RoomId { get; set; }

    //this value can be only public or private
    //the enum i defined earlier
    public RoomType Type { get; set; }

    //The ? means: nullable (“This value is allowed to be null.”)
    //Because:
    // - Public rooms don’t have a code
    // - Private rooms have a code
    public string? Code { get; set; }

    public GamePhase Phase { get; set; } = GamePhase.Lobby;

    public int TotalQuestions { get; set; }
    public int CurrentQuestionIndex { get; set; }

    //A List is:
    //A collection of items in order.
    //So this holds:
    //player 1, player 2, .....
    //With = new();, the list is ready to use.
    public List<Player> Players { get; set; } = new();

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
}
