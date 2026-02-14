using Xunit;
using Microsoft.EntityFrameworkCore;
using backend.Services;
using backend.Models;
using backend.Data;
using backend.Enums;

namespace backend.Tests.Services;

public class GameManagerTests
{
    private readonly GameManager _game;
    private readonly AppDbContext _context;

    public GameManagerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _game = new GameManager(_context);
    }

    // ── CreateRoom ──────────────────────────────────────────

    [Fact]
    public void CreateRoom_Public_ReturnsRoomWithId()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);

        Assert.NotNull(room);
        Assert.NotNull(room.RoomId);
        Assert.Null(room.Code);
        Assert.Equal(5, room.TotalQuestions);
    }

    [Fact]
    public void CreateRoom_Private_ReturnsRoomWithCode()
    {
        var room = _game.CreateRoom(RoomType.Private, 3);

        Assert.NotNull(room);
        Assert.NotNull(room.Code);
        Assert.Equal(6, room.Code.Length); // 6-digit code
    }

    // ── JoinRoom ────────────────────────────────────────────

    [Fact]
    public void JoinRoom_ValidRoom_ReturnsTrue()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        var player = new Player { Id = 1, Username = "Alice", ConnectionId = "conn1" };

        var result = _game.JoinRoom(room.RoomId, player);

        Assert.True(result);
        Assert.Single(room.Players);
    }

    [Fact]
    public void JoinRoom_InvalidRoom_ReturnsFalse()
    {
        var player = new Player { Id = 1, Username = "Alice", ConnectionId = "conn1" };

        var result = _game.JoinRoom("nonexistent", player);

        Assert.False(result);
    }

    [Fact]
    public void JoinRoom_GameAlreadyStarted_ReturnsFalse()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        room.Phase = GamePhase.CollectingAns; // Simulate game started

        var player = new Player { Id = 1, Username = "Alice", ConnectionId = "conn1" };

        var result = _game.JoinRoom(room.RoomId, player);

        Assert.False(result);
    }

    // ── SelectTopic ─────────────────────────────────────────

    [Fact]
    public void SelectTopic_InLobby_ReturnsTrue()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);

        var result = _game.SelectTopic(room, "Science");

        Assert.True(result);
        Assert.Equal("Science", room.SelectedTopic);
        Assert.Equal(GamePhase.ChoosingTopic, room.Phase);
    }

    [Fact]
    public void SelectTopic_NotInLobby_ReturnsFalse()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        room.Phase = GamePhase.CollectingAns;

        var result = _game.SelectTopic(room, "Science");

        Assert.False(result);
    }

    // ── StartGame ───────────────────────────────────────────

    [Fact]
    public void StartGame_SetsPhaseAndFirstQuestion()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        var questions = new List<Question>
        {
            new Question { Id = 1, Text = "Q1", CorrectAnswer = "A1" },
            new Question { Id = 2, Text = "Q2", CorrectAnswer = "A2" }
        };

        _game.StartGame(room, questions);

        Assert.Equal(GamePhase.CollectingAns, room.Phase);
        Assert.Equal(0, room.CurrentQuestionIndex);
        Assert.Equal("Q1", room.CurrentQuestion!.Text);
    }

    // ── SubmitFakeAnswer ────────────────────────────────────

    [Fact]
    public void SubmitFakeAnswer_ValidFake_ReturnsTrue()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        var questions = new List<Question>
        {
            new Question { Id = 1, Text = "Q1", CorrectAnswer = "RealAnswer" }
        };
        _game.StartGame(room, questions);

        var result = _game.SubmitFakeAnswer(room, "conn1", "FakeAnswer");

        Assert.True(result);
        Assert.Equal("FakeAnswer", room.FakeAnswers["conn1"]);
    }

    [Fact]
    public void SubmitFakeAnswer_SameAsCorrect_ReturnsFalse()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        var questions = new List<Question>
        {
            new Question { Id = 1, Text = "Q1", CorrectAnswer = "RealAnswer" }
        };
        _game.StartGame(room, questions);

        var result = _game.SubmitFakeAnswer(room, "conn1", "RealAnswer");

        Assert.False(result);
    }

    [Fact]
    public void SubmitFakeAnswer_WrongPhase_ReturnsFalse()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        room.Phase = GamePhase.Lobby;

        var result = _game.SubmitFakeAnswer(room, "conn1", "FakeAnswer");

        Assert.False(result);
    }

    // ── AllFakeAnswersSubmitted ──────────────────────────────

    [Fact]
    public void AllFakeAnswersSubmitted_AllSubmitted_ReturnsTrue()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        room.Players.Add(new Player { Id = 1, ConnectionId = "conn1" });
        room.Players.Add(new Player { Id = 2, ConnectionId = "conn2" });
        room.FakeAnswers["conn1"] = "fake1";
        room.FakeAnswers["conn2"] = "fake2";

        Assert.True(_game.AllFakeAnswersSubmitted(room));
    }

    [Fact]
    public void AllFakeAnswersSubmitted_NotAll_ReturnsFalse()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        room.Players.Add(new Player { Id = 1, ConnectionId = "conn1" });
        room.Players.Add(new Player { Id = 2, ConnectionId = "conn2" });
        room.FakeAnswers["conn1"] = "fake1";

        Assert.False(_game.AllFakeAnswersSubmitted(room));
    }

    // ── BuildAnswerChoices ──────────────────────────────────

    [Fact]
    public void BuildAnswerChoices_ContainsCorrectAndFakes()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        room.CurrentQuestion = new Question { Id = 1, Text = "Q1", CorrectAnswer = "Correct" };
        room.FakeAnswers["conn1"] = "Fake1";
        room.FakeAnswers["conn2"] = "Fake2";

        var choices = _game.BuildAnswerChoices(room);

        Assert.Equal(3, choices.Count);
        Assert.Contains("Correct", choices);
        Assert.Contains("Fake1", choices);
        Assert.Contains("Fake2", choices);
    }

    // ── ScoreRound ──────────────────────────────────────────

    [Fact]
    public void ScoreRound_CorrectAnswer_Gives2XP()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        var player = new Player { Id = 1, Username = "Alice", ConnectionId = "conn1", XP = 0 };
        room.Players.Add(player);
        room.CurrentQuestion = new Question { Id = 1, Text = "Q1", CorrectAnswer = "Correct" };
        room.ChosenAnswers["conn1"] = "Correct";
        room.FakeAnswers.Clear();

        _game.ScoreRound(room);

        Assert.Equal(2, player.XP);
    }

    [Fact]
    public void ScoreRound_PickedFake_OwnerGets1XP()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        var alice = new Player { Id = 1, Username = "Alice", ConnectionId = "conn1", XP = 0 };
        var bob = new Player { Id = 2, Username = "Bob", ConnectionId = "conn2", XP = 0 };
        room.Players.Add(alice);
        room.Players.Add(bob);
        room.CurrentQuestion = new Question { Id = 1, Text = "Q1", CorrectAnswer = "Correct" };

        // Bob submitted fake "BobFake", Alice chose it
        room.FakeAnswers["conn2"] = "BobFake";
        room.ChosenAnswers["conn1"] = "BobFake";
        room.ChosenAnswers["conn2"] = "Correct";

        _game.ScoreRound(room);

        Assert.Equal(0, alice.XP);   // Alice chose a fake — no XP for correct
        Assert.Equal(3, bob.XP);     // Bob: 2 (correct) + 1 (Alice picked his fake)
    }

    // ── NextRound ───────────────────────────────────────────

    [Fact]
    public void NextRound_HasMore_ReturnsTrue()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);
        room.Questions = new List<Question>
        {
            new Question { Id = 1, Text = "Q1", CorrectAnswer = "A1" },
            new Question { Id = 2, Text = "Q2", CorrectAnswer = "A2" },
        };
        room.CurrentQuestionIndex = 0;
        room.Phase = GamePhase.CollectingAns;

        var result = _game.NextRound(room);

        Assert.True(result);
        Assert.Equal(1, room.CurrentQuestionIndex);
        Assert.Equal("Q2", room.CurrentQuestion!.Text);
        Assert.Equal(GamePhase.CollectingAns, room.Phase);
    }

    [Fact]
    public void NextRound_LastQuestion_ReturnsFalseAndEndsGame()
    {
        var room = _game.CreateRoom(RoomType.Public, 2);
        room.Questions = new List<Question>
        {
            new Question { Id = 1, Text = "Q1", CorrectAnswer = "A1" },
            new Question { Id = 2, Text = "Q2", CorrectAnswer = "A2" },
        };
        room.CurrentQuestionIndex = 1; // already on last question

        var result = _game.NextRound(room);

        Assert.False(result);
        Assert.Equal(GamePhase.GameEnded, room.Phase);
    }

    // ── GetGameState ────────────────────────────────────────

    [Fact]
    public void GetGameState_ReturnsCorrectState()
    {
        var room = _game.CreateRoom(RoomType.Private, 3);
        room.SelectedTopic = "History";
        room.CurrentQuestion = new Question { Id = 1, Text = "Q1", CorrectAnswer = "A1" };
        room.Players.Add(new Player { Id = 1, Username = "Alice", ConnectionId = "c1" });

        var state = _game.GetGameState(room);

        Assert.Equal(room.RoomId, state.RoomId);
        Assert.Equal(GamePhase.Lobby, state.Phase);
        Assert.Equal("History", state.SelectedTopic);
        Assert.NotNull(state.RoomCode);
        Assert.Single(state.Players);
    }

    // ── SaveGameSession ─────────────────────────────────────

    [Fact]
    public async Task SaveGameSession_PersistsToDatabase()
    {
        var room = _game.CreateRoom(RoomType.Public, 3);
        room.SelectedTopic = "Science";

        // Add players to DB first (required for foreign key)
        var p1 = new Player { Id = 100, Username = "Alice", AvatarImageName = "a1", XP = 5 };
        var p2 = new Player { Id = 101, Username = "Bob", AvatarImageName = "a2", XP = 3 };
        _context.Players.Add(p1);
        _context.Players.Add(p2);
        await _context.SaveChangesAsync();

        // Add them to room
        room.Players.Add(p1);
        room.Players.Add(p2);

        await _game.SaveGameSession(room);

        Assert.Single(_context.GameSessions);
        Assert.Equal(2, _context.GameParticipants.Count());

        var session = _context.GameSessions.First();
        Assert.Equal(3, session.TotalRounds);

        // Check participants are ranked correctly
        var participants = _context.GameParticipants.OrderBy(gp => gp.FinalRank).ToList();
        Assert.Equal(5, participants[0].FinalScore); // Alice ranked #1
        Assert.Equal(3, participants[1].FinalScore); // Bob ranked #2
    }
}