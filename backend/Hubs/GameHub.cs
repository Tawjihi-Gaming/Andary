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

    // Start game after players joined
    public async Task StartGame(string roomId)
    {
        var room = _game.GetRoom(roomId);

        var questions = _questionsService.GetQuestions(room.TotalQuestions);

        _game.StartGame(room, questions);

        var gameState = _game.GetGameState(room);
        await Clients.Group(roomId).SendAsync("GameStarted", gameState);
    }

    //Task is a type in .NET used for asynchronous operations.
    //Task represents a promise that some work will complete in the future.
    public async Task CreateRoom(bool isPrivate, int questions)
    {
        RoomType type;
        if (isPrivate)
            type = RoomType.Private;
        else
            type = RoomType.Public;

        var room = _game.CreateRoom(type, questions);
        //await
        // - Pauses the method without blocking the thread until the awaited Task finishes.
        //Adds this player to a SignalR group for the room.
        await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomId);

        //Sends confirmation to the player who created the room, including room ID and code.
        await Clients.Caller.SendAsync("RoomCreated", room.RoomId, room.Code);
    }

    public async Task JoinRoom(string roomId, string name)
    {
        var player = new Player
        {
            ConnectionId = Context.ConnectionId,
            Name = name
        };

        if (!_game.JoinRoom(roomId, player))
        {
            await Clients.Caller.SendAsync("JoinFailed");
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("PlayerJoined", name);
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
        }
    }

}