//The game brain.

using Backend.Enums;
using Backend.Models;
using Backend.Data;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Services;

public enum JoinRoomResult
{
    Success,
    RoomNotFound,
    NotInLobby,
    RoomFull,
    DuplicateAccount,
    DuplicateGuest
}

public class LeaveRoomResult
{
    public bool PlayerRemoved { get; set; }
    public bool RoomClosed { get; set; }
    public bool OwnershipTransferred { get; set; }
    public string? RemovedSessionId { get; set; }
    public string? RemovedName { get; set; }
    public string? NewOwnerSessionId { get; set; }
    public string? NewOwnerName { get; set; }
}

public class GameManager
{
    private readonly Dictionary<string, Room> _rooms = new();
    private readonly IServiceScopeFactory _scopeFactory;

    public GameManager(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    // Creates a room and automatically adds the creator as the owner.
    public (Room room, SessionPlayer owner) CreateRoom(RoomType type, int totalQuestions, string name, SessionPlayer creator)
    {
        var room = new Room();
        room.RoomId = Guid.NewGuid().ToString();
        room.Name = name;
        room.Type = type;
        room.OwnerSessionId = creator.SessionId;

        if (type == RoomType.Private)
            //6 digits
            room.Code = new Random().Next(100000, 999999).ToString();
        else
            room.Code = null;

        room.TotalQuestions = totalQuestions;

        // Auto-join the creator into the room
        // The owner is always ready by default
        creator.IsReady = true;
        room.Players.Add(creator);

        _rooms[room.RoomId] = room;

        return (room, creator);
    }

    //Join an existing room
    // Accepts SessionPlayer (in-memory) instead of Player (DB).
    // Anyone can join — logged-in or anonymous.
    public JoinRoomResult JoinRoom(string roomId, SessionPlayer sessionPlayer)
    {
        if (!_rooms.TryGetValue(roomId, out var room))
            return JoinRoomResult.RoomNotFound;
        if (room.Phase != GamePhase.Lobby)
            return JoinRoomResult.NotInLobby;
        if (room.Players.Count >= Room.MaxPlayers)
            return JoinRoomResult.RoomFull;

        // Prevent the same logged-in account from joining the same room multiple times.
        if (sessionPlayer.PlayerId.HasValue &&
            room.Players.Any(p => p.PlayerId == sessionPlayer.PlayerId.Value))
            return JoinRoomResult.DuplicateAccount;

        // Prevent the same guest browser/session from joining the same room multiple times.
        if (!sessionPlayer.PlayerId.HasValue &&
            !string.IsNullOrWhiteSpace(sessionPlayer.ClientKey) &&
            room.Players.Any(p =>
                !p.PlayerId.HasValue &&
                !string.IsNullOrWhiteSpace(p.ClientKey) &&
                string.Equals(p.ClientKey, sessionPlayer.ClientKey, StringComparison.Ordinal)))
            return JoinRoomResult.DuplicateGuest;

        room.Players.Add(sessionPlayer);
        return JoinRoomResult.Success;
    }

    // Remove a player from a room and transfer ownership if needed.
    public LeaveRoomResult LeaveRoom(string roomId, string sessionId)
    {
        var result = new LeaveRoomResult();

        if (!_rooms.TryGetValue(roomId, out var room))
            return result;

        var player = room.Players.FirstOrDefault(p => p.SessionId == sessionId);
        if (player == null)
            return result;

        var removedIndex = room.Players.IndexOf(player);
        var wasOwner = room.OwnerSessionId == player.SessionId;

        room.Players.RemoveAt(removedIndex);
        result.PlayerRemoved = true;
        result.RemovedSessionId = player.SessionId;
        result.RemovedName = player.DisplayName;

        // Remove round data written by this player to avoid stale counts.
        if (!string.IsNullOrWhiteSpace(player.ConnectionId))
        {
            room.FakeAnswers.Remove(player.ConnectionId);
            room.ChosenAnswers.Remove(player.ConnectionId);
        }

        if (room.Players.Count == 0)
        {
            _rooms.Remove(roomId);
            result.RoomClosed = true;
            return result;
        }

        // Keep chooser index valid after removing a player.
        if (removedIndex < room.TopicChooserIndex)
            room.TopicChooserIndex--;
        if (room.TopicChooserIndex >= room.Players.Count)
            room.TopicChooserIndex = 0;
        if (room.TopicChooserIndex < 0)
            room.TopicChooserIndex = 0;

        if (wasOwner)
        {
            var newOwner = room.Players[0];
            room.OwnerSessionId = newOwner.SessionId;
            newOwner.IsReady = true;
            result.OwnershipTransferred = true;
            result.NewOwnerSessionId = newOwner.SessionId;
            result.NewOwnerName = newOwner.DisplayName;
        }

        return result;
    }

    //Get room by id
    public Room GetRoom(string roomId)
    {
        return _rooms[roomId];
    }

    public bool TryGetRoom(string roomId, out Room? room)
    {
        return _rooms.TryGetValue(roomId, out room);
    }

    // Find player by SignalR connection (used for unexpected disconnects).
    public (string roomId, string sessionId)? FindPlayerByConnection(string connectionId)
    {
        foreach (var kv in _rooms)
        {
            var player = kv.Value.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player != null)
                return (kv.Key, player.SessionId);
        }
        return null;
    }

    // Get room by its code (used for private room join-by-code)
    public Room? GetRoomByCode(string code)
    {
        return _rooms.Values.FirstOrDefault(r => r.Code == code);
    }

    // Add a topic to the room's selected topics list (lobby phase)
    // Returns false if at max (7) or topic already selected
    public bool AddTopic(Room room, string topic)
    {
        if (room.Phase != GamePhase.Lobby)
            return false;
        if (room.SelectedTopics.Count >= 7)
            return false;
        if (room.SelectedTopics.Contains(topic))
            return false;

        room.SelectedTopics.Add(topic);
        return true;
    }

    // Remove a topic from the room's selected topics list (lobby phase)
    public bool RemoveTopic(Room room, string topic)
    {
        if (room.Phase != GamePhase.Lobby)
            return false;

        return room.SelectedTopics.Remove(topic);
    }

    //start game — fetches questions from all selected topics
    // At least 1 topic must be selected before starting
    public bool CanStartGame(Room room)
    {
        return room.SelectedTopics.Count >= 1;
    }

    // Toggle a player's ready status
    public bool SetReady(Room room, string sessionId, bool isReady)
    {
        var player = room.Players.FirstOrDefault(p => p.SessionId == sessionId);
        if (player == null)
            return false;
        player.IsReady = isReady;
        return true;
    }

    // Check if all players in the room are ready
    public bool AllPlayersReady(Room room)
    {
        return room.Players.Count > 0 && room.Players.All(p => p.IsReady);
    }

    // Check if a player is the room owner
    public bool IsRoomOwner(Room room, string sessionId)
    {
        return room.OwnerSessionId == sessionId;
    }

    //start game — now uses all selected topics to filter questions
    public void StartGame(Room room, List<Question> questions)
    {
        room.Questions = questions;
        room.CurrentQuestionIndex = 0;
        room.TopicChooserIndex = Random.Shared.Next(room.Players.Count);
        room.UsedQuestionIds.Clear();
        room.FakeAnswers.Clear();
        room.ChosenAnswers.Clear();

        // If only 1 topic selected → no per-round choice needed, go straight to collecting answers
        if (room.SelectedTopics.Count == 1)
        {
            var singleTopic = room.SelectedTopics[0];
            room.CurrentRoundTopic = singleTopic;
            room.CurrentQuestion = room.Questions
                .FirstOrDefault(q => TopicMatches(q, singleTopic));

            if (room.CurrentQuestion == null)
            {
                room.Phase = GamePhase.GameEnded;
                return;
            }

            room.UsedQuestionIds.Add(room.CurrentQuestion.Id);
            room.Phase = GamePhase.CollectingAns;
        }
        // If multiple topics → first player chooses topic for first round
        else
        {
            room.Phase = GamePhase.ChoosingRoundTopic;
        }
    }

    // Player selects the topic for the current round (only when multiple topics exist)
    public bool SelectRoundTopic(Room room, string connectionId, string sessionId, string topic)
    {
        if (room.Phase != GamePhase.ChoosingRoundTopic)
            return false;

        var chooser = room.Players[room.TopicChooserIndex];

        // Validate caller is the chooser: use sessionId when provided, else fall back to connectionId
        bool isChooser = false;
        if (!string.IsNullOrEmpty(sessionId) && chooser.SessionId == sessionId)
        {
            isChooser = true;
            if (string.IsNullOrEmpty(chooser.ConnectionId))
                chooser.ConnectionId = connectionId; // Update stale connection
        }
        else
        {
            var caller = room.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            isChooser = caller != null && caller.SessionId == chooser.SessionId;
        }

        if (!isChooser)
            return false;

        // Must be one of the selected topics (flexible match: trim, ignore case)
        var matchedTopic = room.SelectedTopics.FirstOrDefault(t =>
            string.Equals(t?.Trim(), topic?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (matchedTopic == null)
            return false;

        room.CurrentRoundTopic = matchedTopic;

        // Find a question for this topic that hasn't been used yet
        var question = room.Questions
            .Where(q => TopicMatches(q, matchedTopic) && !room.UsedQuestionIds.Contains(q.Id))
            .FirstOrDefault();

        if (question == null)
            return false;

        room.CurrentQuestion = question;
        room.UsedQuestionIds.Add(question.Id);
        room.Phase = GamePhase.CollectingAns;
        return true;
    }

    // Compare question topic and selected topic in a tolerant way.
    private bool TopicMatches(Question q, string topicName)
    {
        return string.Equals(q.TopicName?.Trim(), topicName?.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    //Submit fake answer
    public bool SubmitFakeAnswer(Room room, string connectionId, string fake)
    {
        if (room.Phase != GamePhase.CollectingAns)
            return false;

        if (fake == room.CurrentQuestion!.CorrectAnswer)
            return false;

        room.FakeAnswers[connectionId] = fake;
        return true;
    }

    // Check if all players submitted fake answers
    public bool AllFakeAnswersSubmitted(Room room)
    {
        return room.FakeAnswers.Count == room.Players.Count;
    }

    // Build choices (correct + fake)
    public List<string> BuildAnswerChoices(Room room)
    {
        //Takes all the fake answers submitted by players from the room’s dictionary:
        //.Values → gives only the answers, ignoring which player submitted them.
        //.ToList() → converts them into a List<string>, so we can manipulate them easily.
        //Why it’s needed:
        //We need a list of all fake answers to show as choices to the players.
        var answers = room.FakeAnswers.Values.ToList();

        //Adds the correct answer to the list of fake answers.
        //tells “I promise CurrentQuestion is not null here.”
        answers.Add(room.CurrentQuestion!.CorrectAnswer);

        //Shuffles the list of answers randomly.
        //OrderBy(_ => Guid.NewGuid()) → creates a new random order.
        //OrderBy is a LINQ method in C# that sorts a list or collection
        //_ -> This is the parameter that represents each element in the list.
        // Here, we don’t care about the answer itself.
        // We just want a random number for each element.
        //_ is often used when you don’t actually care about the value.
        return answers.OrderBy(_ => Guid.NewGuid()).ToList();
    }

    // Submit chosen answer
    public void SubmitChosenAnswer(Room room, string connectionId, string answer)
    {
        room.ChosenAnswers[connectionId] = answer;
    }

    public void ScoreRound(Room room)
    {
        //Looks up which answer this player chose during the “ChoosingAnswer” phase.
        //We need the player’s choice to score them properly.
        foreach (var player in room.Players)
        {
            var chosen = room.ChosenAnswers[player.ConnectionId];

            //check if the player chose the correct answer
            if (chosen == room.CurrentQuestion!.CorrectAnswer)
                player.Score += 2;

            //Loops through all fake answers submitted by players.
            foreach (var fake in room.FakeAnswers)
            {
                //Checks two things:
                // - Did the player pick this fake answer (fake.Value == chosen)?
                // - Make sure it’s not their own fake (fake.Key != player.ConnectionId)
                if (fake.Value == chosen && fake.Key != player.ConnectionId)
                {
                    //Finds the player who wrote this fake answer.
                    var owner = room.Players.First(p => p.ConnectionId == fake.Key);
                    owner.Score += 1;
                }
            }
        }
    }

    // Advance to next round
    public bool NextRound(Room room)
    {
        room.CurrentQuestionIndex++;
        if (room.CurrentQuestionIndex >= room.TotalQuestions)
        {
            room.Phase = GamePhase.GameEnded;
            return false;
        }

        room.FakeAnswers.Clear();
        room.ChosenAnswers.Clear();

        // Randomly select next topic chooser (different from current when possible)
        if (room.Players.Count > 1)
        {
            int next;
            do { next = Random.Shared.Next(room.Players.Count); }
            while (next == room.TopicChooserIndex);
            room.TopicChooserIndex = next;
        }

        // If only 1 topic → auto-pick, go straight to collecting answers
        if (room.SelectedTopics.Count == 1)
        {
            room.CurrentRoundTopic = room.SelectedTopics[0];
            room.CurrentQuestion = room.Questions
                .FirstOrDefault(q =>
                    TopicMatches(q, room.CurrentRoundTopic) &&
                    !room.UsedQuestionIds.Contains(q.Id));

            if (room.CurrentQuestion == null)
            {
                room.Phase = GamePhase.GameEnded;
                return false;
            }

            room.UsedQuestionIds.Add(room.CurrentQuestion.Id);
            room.Phase = GamePhase.CollectingAns;
        }
        // If multiple topics → next player chooses the topic
        else
        {
            room.Phase = GamePhase.ChoosingRoundTopic;
        }

        return true;
    }

    // Build GameState for clients
    public GameState GetGameState(Room room)
    {
        var state = new GameState();
        state.RoomId = room.RoomId;
        state.Phase = room.Phase;
        state.CurrentQuestionIndex = room.CurrentQuestionIndex;
        state.TotalQuestions = room.TotalQuestions;
        state.CurrentQuestion = room.CurrentQuestion;
        state.Players = room.Players;
        state.RoomCode = room.Code;
        state.SelectedTopics = room.SelectedTopics;
        state.CurrentRoundTopic = room.CurrentRoundTopic;

        // Tell the frontend who is choosing the topic and whether a choice is needed
        if (room.Players.Count > 0)
        {
            var chooser = room.Players[room.TopicChooserIndex];
            state.TopicChooserName = chooser.DisplayName;
            state.CurrentPlayerSessionId = chooser.SessionId;
        }
        state.NeedsTopicChoice = room.SelectedTopics.Count > 1;

        if (room.Phase == GamePhase.ChoosingAns)
            state.Choices = BuildAnswerChoices(room);
        else
            state.Choices = new List<string>();

        return state;
    }

    // Save game session and participants to database.
    // Only saves GameParticipant records for logged-in players (those with a PlayerId).
    // Anonymous/guest players' scores are shown in-game but not persisted.
    public async Task SaveGameSession(Room room)
    {
        AppDbContext context;
        IServiceScope? scope = null;

        scope = _scopeFactory.CreateScope();
        context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        try
        {
            var gameSession = new GameSession
            {
                TotalRounds = room.TotalQuestions,
                FinishedAt = DateTime.UtcNow,
                GameConfigSnapshot = JsonSerializer.Serialize(new { Topics = room.SelectedTopics })
            };

            context.GameSessions.Add(gameSession);
            await context.SaveChangesAsync();

            // Create game participants with final scores and ranks
            var rankedPlayers = room.Players
                .OrderByDescending(p => p.Score)
                .Select((p, index) => new { SessionPlayer = p, Rank = index + 1 })
                .ToList();

            foreach (var rankedPlayer in rankedPlayers)
            {
                // Only persist stats for logged-in players (those linked to a DB account)
                if (rankedPlayer.SessionPlayer.PlayerId == null)
                    continue;

                var participant = new GameParticipant
                {
                    GameSessionId = gameSession.Id,
                    PlayerId = rankedPlayer.SessionPlayer.PlayerId.Value,
                    FinalScore = rankedPlayer.SessionPlayer.Score,
                    FinalRank = rankedPlayer.Rank
                };
                context.GameParticipants.Add(participant);

                // Update the player's total XP in the database
                var dbPlayer = await context.Players.FindAsync(rankedPlayer.SessionPlayer.PlayerId.Value);
                if (dbPlayer != null)
                {
                    dbPlayer.Xp += rankedPlayer.SessionPlayer.Score;
                }
            }

            await context.SaveChangesAsync();
        }
        finally
        {
            scope?.Dispose();
        }
    }

}
