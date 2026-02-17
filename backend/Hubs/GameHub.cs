//Real-time communication only.

using Microsoft.AspNetCore.SignalR;
using backend.Services;
using backend.Models;
using backend.Enums;

namespace backend.Hubs;

public class GameHub : Hub
{
    private readonly GameManager _game;
    private readonly QuestionsService _questionsService;

    public GameHub(GameManager game, QuestionsService questionsService)
    {
        _game = game;
        _questionsService = questionsService;
    }

    // Called by each player after joining a room (via REST API) to register
    // their SignalR connection with the room's group.
    // Uses sessionId (UUID) instead of playerName to identify the player.
    public async Task ConnectToRoom(string roomId, string sessionId)
    {
        var room = _game.GetRoom(roomId);

        // Link the SignalR connectionId to the session player who joined via API
        var sessionPlayer = room.Players.FirstOrDefault(p => p.SessionId == sessionId);
        if (sessionPlayer == null)
            return;

        sessionPlayer.ConnectionId = Context.ConnectionId;

        // Add this connection to the SignalR group for real-time updates
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("PlayerConnected", sessionPlayer.DisplayName);
    }

    // Player toggles their ready status in the lobby.
    public async Task SetReady(string roomId, string sessionId, bool isReady)
    {
        var room = _game.GetRoom(roomId);

        if (!_game.SetReady(room, sessionId, isReady))
            return;

        var lobbyState = room.Players.Select(p => new
        {
            sessionId = p.SessionId,
            name = p.DisplayName,
            isReady = p.IsReady
        });
        await Clients.Group(roomId).SendAsync("LobbyUpdated", lobbyState);

        if (_game.AllPlayersReady(room))
            await Clients.Group(roomId).SendAsync("AllPlayersReady");
    }

    // Player adds a topic to the room's selected topics (lobby phase).
    // Any player can add topics. Max 7 topics, min 1 to start.
    public async Task AddTopic(string roomId, string topic)
    {
        var room = _game.GetRoom(roomId);

        if (!_game.AddTopic(room, topic))
            return;

        // Broadcast updated topic list to all players
        await Clients.Group(roomId).SendAsync("TopicsUpdated", room.SelectedTopics);
    }

    // Player removes a topic from the room's selected topics (lobby phase).
    public async Task RemoveTopic(string roomId, string topic)
    {
        var room = _game.GetRoom(roomId);

        if (!_game.RemoveTopic(room, topic))
            return;

        await Clients.Group(roomId).SendAsync("TopicsUpdated", room.SelectedTopics);
    }

    // Returns the list of available topics to the caller
    public async Task GetTopics(string roomId)
    {
        var topics = _questionsService.GetTopics();
        await Clients.Caller.SendAsync("AvailableTopics", topics);
    }

    // Start game — only the room owner can start, and all players must be ready.
    public async Task StartGame(string roomId, string sessionId)
    {
        var room = _game.GetRoom(roomId);

        // Only the room owner can start the game
        if (!_game.IsRoomOwner(room, sessionId))
            return;

        // All players must be ready before starting
        if (!_game.AllPlayersReady(room))
            return;

        // At least 1 topic must be selected
        if (!_game.CanStartGame(room))
            return;

        // Fetch questions from all selected topics
        var questions = _questionsService.GetQuestionsFromTopics(room.TotalQuestions, room.SelectedTopics);

        _game.StartGame(room, questions);

        var gameState = _game.GetGameState(room);

        // If multiple topics → tell frontend that a player must choose topic first
        if (room.Phase == GamePhase.ChoosingRoundTopic)
            await Clients.Group(roomId).SendAsync("ChooseRoundTopic", gameState);
        else
            await Clients.Group(roomId).SendAsync("GameStarted", gameState);
    }

    // Per-round topic selection — the designated player picks the topic for this round
    public async Task SelectRoundTopic(string roomId, string topic)
    {
        var room = _game.GetRoom(roomId);

        if (!_game.SelectRoundTopic(room, Context.ConnectionId, topic))
            return;

        var gameState = _game.GetGameState(room);
        await Clients.Group(roomId).SendAsync("GameStarted", gameState);
    }

    public async Task SubmitFakeAnswer(string roomId, string fake)
    {
        var room = _game.GetRoom(roomId);

        if (!_game.SubmitFakeAnswer(room, Context.ConnectionId, fake))
            return;

        if (_game.AllFakeAnswersSubmitted(room))
        {
            room.Phase = GamePhase.ChoosingAns;
            var choices = _game.BuildAnswerChoices(room);

            await Clients.Group(roomId).SendAsync("ShowChoices", choices);
        }
    }

    public async Task ChooseAnswer(string roomId, string answer)
    {
        var room = _game.GetRoom(roomId);
        _game.SubmitChosenAnswer(room, Context.ConnectionId, answer);

        if (room.ChosenAnswers.Count == room.Players.Count)
        {
            _game.ScoreRound(room);
            room.Phase = GamePhase.ShowingRanking;

            var gameState = _game.GetGameState(room);
            await Clients.Group(roomId).SendAsync("RoundEnded", gameState);
        }
    }

    public async Task NextRound(string roomId)
    {
        var room = _game.GetRoom(roomId);
        if (_game.NextRound(room))
        {
            var gameState = _game.GetGameState(room);

            // If multiple topics → next player chooses topic before round starts
            if (room.Phase == GamePhase.ChoosingRoundTopic)
                await Clients.Group(roomId).SendAsync("ChooseRoundTopic", gameState);
            else
                await Clients.Group(roomId).SendAsync("GameStarted", gameState);
        }
        else
        {
            var gameState = _game.GetGameState(room);
            await Clients.Group(roomId).SendAsync("GameEnded", gameState);

            // Save game session to database when game ends
            await _game.SaveGameSession(room);
        }
    }

}