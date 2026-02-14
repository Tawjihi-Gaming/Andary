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
    // This is the entry point into real-time communication.
    public async Task ConnectToRoom(string roomId, string playerName)
    {
        var room = _game.GetRoom(roomId);

        // Link the SignalR connectionId to the player who joined via API
        var player = room.Players.FirstOrDefault(p => p.Username == playerName);
        if (player == null)
            return;

        player.ConnectionId = Context.ConnectionId;

        // Add this connection to the SignalR group for real-time updates
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("PlayerConnected", playerName);
    }

    // Player selects a topic for the room.
    // Frontend shows topic options → player picks one → this method is called.
    // Backend stores the choice, then broadcasts it + available topics to all players.
    public async Task SelectTopic(string roomId, string topic)
    {
        var room = _game.GetRoom(roomId);

        if (!_game.SelectTopic(room, topic))
            return;

        // Tell all players in the room which topic was chosen
        await Clients.Group(roomId).SendAsync("TopicSelected", topic);
    }

    // Returns the list of available topics to the caller
    public async Task GetTopics(string roomId)
    {
        var topics = _questionsService.GetTopics();
        await Clients.Caller.SendAsync("AvailableTopics", topics);
    }

    // Start game — uses the topic the player already selected
    public async Task StartGame(string roomId)
    {
        var room = _game.GetRoom(roomId);

        // A topic must be selected before starting
        if (room.SelectedTopic == null)
            return;

        // Fetch questions filtered by the chosen topic
        var questions = _questionsService.GetQuestions(room.TotalQuestions, room.SelectedTopic);

        _game.StartGame(room, questions);

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