//Real-time communication only.

using Microsoft.AspNetCore.SignalR;
using Backend.Services;
using Backend.Models;
using Backend.Enums;
using System.Collections.Concurrent;

namespace Backend.Hubs;

public class GameHub : Hub
{
    private readonly GameManager _game;
    private readonly QuestionsService _questionsService;
    private readonly IHubContext<GameHub> _hubContext;
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> _phaseTimers = new();

    public GameHub(GameManager game, QuestionsService questionsService, IHubContext<GameHub> hubContext)
    {
        _game = game;
        _questionsService = questionsService;
        _hubContext = hubContext;
    }

    private async Task BroadcastLobbyState(string roomId, Room room)
    {
        var lobbyState = room.Players.Select(p => new
        {
            sessionId = p.SessionId,
            name = p.DisplayName,
            isReady = p.IsReady
        });
        await Clients.Group(roomId).SendAsync("LobbyUpdated", lobbyState);
    }

    private async Task HandlePlayerExit(string roomId, string sessionId, bool disconnected)
    {
        var leaveResult = _game.LeaveRoom(roomId, sessionId);
        await BroadcastLeaveResult(roomId, leaveResult, disconnected);
    }

    private Task SendShowChoices(string roomId, Room room, List<string> choices, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients.Group(roomId).SendAsync("ShowChoices", new
        {
            choices,
            answerTimeSeconds = room.AnswerTimeSeconds,
            phaseDeadlineUtc = room.PhaseDeadlineUtc
        }, cancellationToken);
    }

    private void CancelPhaseTimer(string roomId)
    {
        if (_phaseTimers.TryRemove(roomId, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
        }
    }

    private void SyncPhaseTimer(string roomId, Room room)
    {
        CancelPhaseTimer(roomId);

        if (room.PhaseDeadlineUtc == null)
            return;

        if (room.Phase != GamePhase.CollectingAns && room.Phase != GamePhase.ChoosingAns)
            return;

        var remaining = room.PhaseDeadlineUtc.Value - DateTime.UtcNow;
        if (remaining < TimeSpan.Zero)
            remaining = TimeSpan.Zero;

        var cts = new CancellationTokenSource();
        _phaseTimers[roomId] = cts;

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(remaining, cts.Token);
                if (cts.Token.IsCancellationRequested)
                    return;

                await HandlePhaseTimeout(roomId, cts.Token);
            }
            catch (TaskCanceledException)
            {
            }
            finally
            {
                if (_phaseTimers.TryGetValue(roomId, out var current) && ReferenceEquals(current, cts))
                    _phaseTimers.TryRemove(roomId, out _);
                cts.Dispose();
            }
        });
    }

    private async Task HandlePhaseTimeout(string roomId, CancellationToken cancellationToken)
    {
        if (!_game.TryGetRoom(roomId, out var room) || room == null)
            return;

        if (room.PhaseDeadlineUtc == null)
            return;

        // Deadline moved while this timer was waiting; reschedule against latest value.
        if (DateTime.UtcNow < room.PhaseDeadlineUtc.Value)
        {
            SyncPhaseTimer(roomId, room);
            return;
        }

        if (room.Phase == GamePhase.CollectingAns)
        {
            room.Phase = GamePhase.ChoosingAns;
            _game.RefreshPhaseDeadline(room);
            var choices = _game.BuildAnswerChoices(room);
            await SendShowChoices(roomId, room, choices, cancellationToken);
            SyncPhaseTimer(roomId, room);
            return;
        }

        if (room.Phase == GamePhase.ChoosingAns)
        {
            _game.ScoreRound(room);
            room.Phase = GamePhase.ShowingRanking;
            _game.RefreshPhaseDeadline(room);
            var gameState = _game.GetGameState(room);
            await _hubContext.Clients.Group(roomId).SendAsync("RoundEnded", gameState, cancellationToken);
            SyncPhaseTimer(roomId, room);
        }
    }

    private async Task BroadcastLeaveResult(string roomId, LeaveRoomResult leaveResult, bool disconnected)
    {
        if (!leaveResult.PlayerRemoved)
            return;

        await Clients.Group(roomId).SendAsync(
            disconnected ? "PlayerDisconnected" : "PlayerLeft",
            new
            {
                sessionId = leaveResult.RemovedSessionId,
                name = leaveResult.RemovedName
            });

        if (leaveResult.RoomClosed)
        {
            CancelPhaseTimer(roomId);
            await Clients.Group(roomId).SendAsync("RoomClosed", new
            {
                message = "The room has been closed.",
                reason = "All players left."
            });
            return;
        }

        if (leaveResult.OwnershipTransferred)
        {
            await Clients.Group(roomId).SendAsync("OwnershipTransferred", new
            {
                newOwnerSessionId = leaveResult.NewOwnerSessionId,
                newOwnerName = leaveResult.NewOwnerName
            });
        }

        if (_game.TryGetRoom(roomId, out var updatedRoom) && updatedRoom != null)
            await BroadcastPostLeaveState(roomId, updatedRoom);
    }

    private async Task BroadcastPostLeaveState(string roomId, Room room)
    {
        if (room.Phase == GamePhase.Lobby)
        {
            CancelPhaseTimer(roomId);
            await BroadcastLobbyState(roomId, room);
            return;
        }

        // Active game cannot continue with fewer than the minimum required players.
        if (room.Phase != GamePhase.GameEnded && room.Players.Count < Room.MinPlayers)
        {
            room.Phase = GamePhase.GameEnded;
            _game.RefreshPhaseDeadline(room);
            CancelPhaseTimer(roomId);
            var endedState = _game.GetGameState(room);
            await Clients.Group(roomId).SendAsync("GameEnded", endedState);
            await _game.SaveGameSession(room);
            return;
        }

        // If a leave unblocks the round, advance immediately instead of waiting for a new submit action.
        if (room.Phase == GamePhase.CollectingAns && _game.AllFakeAnswersSubmitted(room))
        {
            room.Phase = GamePhase.ChoosingAns;
            _game.RefreshPhaseDeadline(room);
            var choices = _game.BuildAnswerChoices(room);
            await SendShowChoices(roomId, room, choices);
            SyncPhaseTimer(roomId, room);
            return;
        }

        if (room.Phase == GamePhase.ChoosingAns && room.ChosenAnswers.Count == room.Players.Count)
        {
            _game.ScoreRound(room);
            room.Phase = GamePhase.ShowingRanking;
            _game.RefreshPhaseDeadline(room);
            var roundState = _game.GetGameState(room);
            await Clients.Group(roomId).SendAsync("RoundEnded", roundState);
            SyncPhaseTimer(roomId, room);
            return;
        }

        var gameState = _game.GetGameState(room);
        SyncPhaseTimer(roomId, room);
        if (room.Phase == GamePhase.ChoosingRoundTopic)
            await Clients.Group(roomId).SendAsync("ChooseRoundTopic", gameState);
        else
            await Clients.Group(roomId).SendAsync("GameStateSync", gameState);
    }

    // Called by each player after joining a room (via REST API) to register
    // their SignalR connection with the room's group.
    // Uses sessionId (UUID) instead of playerName to identify the player.
    public async Task ConnectToRoom(string roomId, string sessionId)
    {
        if (!_game.TryGetRoom(roomId, out var room) || room == null)
            return;

        if (!_game.TryReconnectPlayer(roomId, sessionId, Context.ConnectionId))
            return;

        // Add this connection to the SignalR group for real-time updates
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        var sessionPlayer = room.Players.FirstOrDefault(p => p.SessionId == sessionId);
        if (sessionPlayer != null)
            await Clients.Group(roomId).SendAsync("PlayerConnected", sessionPlayer.DisplayName);

        // Keep lobby player list in sync as soon as a connection joins.
        if (room.Phase == GamePhase.Lobby)
            await BroadcastLobbyState(roomId, room);
    }

    // Reconnect helper used by frontend after refresh/reconnect.
    public async Task RejoinRoom(string roomId, string sessionId)
    {
        await ConnectToRoom(roomId, sessionId);

        if (_game.TryGetRoom(roomId, out var room) && room != null)
        {
            var state = _game.GetGameState(room);
            await Clients.Caller.SendAsync("GameStateSync", state);
            SyncPhaseTimer(roomId, room);
        }
    }

    // Explicit leave from frontend.
    public async Task LeaveRoom(string roomId, string sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        await HandlePlayerExit(roomId, sessionId, disconnected: false);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var player = _game.FindPlayerByConnection(Context.ConnectionId);
        if (player.HasValue)
        {
            var roomId = player.Value.roomId;
            var sessionId = player.Value.sessionId;

            if (_game.MarkDisconnected(roomId, sessionId, out var disconnectedName, out var graceSeconds))
            {
                await Clients.Group(roomId).SendAsync("PlayerDisconnected", new
                {
                    sessionId,
                    name = disconnectedName,
                    temporary = true,
                    graceSeconds
                });

                await Task.Delay(TimeSpan.FromSeconds(graceSeconds));
                var leaveResult = _game.LeaveRoomIfDisconnectExpired(roomId, sessionId);
                await BroadcastLeaveResult(roomId, leaveResult, disconnected: true);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    // Player toggles their ready status in the lobby.
    public async Task SetReady(string roomId, string sessionId, bool isReady)
    {
        var room = _game.GetRoom(roomId);

        if (!_game.SetReady(room, sessionId, isReady))
            return;

        await BroadcastLobbyState(roomId, room);

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

        // Need at least 2 players to start
        if (room.Players.Count < Room.MinPlayers)
            return;

        // All players must be ready before starting
        if (!_game.AllPlayersReady(room))
            return;

        // At least 1 topic must be selected
        if (!_game.CanStartGame(room))
            return;

        // Fetch questions from all selected topics
        var questions = _questionsService.GetQuestionsFromTopics(room.TotalQuestions, room.SelectedTopics);
        if (questions.Count == 0)
        {
            await Clients.Caller.SendAsync("GameError", new { message = "No questions are available for the selected topics." });
            return;
        }

        _game.StartGame(room, questions);

        var gameState = _game.GetGameState(room);

        // If multiple topics → tell frontend that a player must choose topic first
        if (room.Phase == GamePhase.ChoosingRoundTopic)
            await Clients.Group(roomId).SendAsync("ChooseRoundTopic", gameState);
        else
            await Clients.Group(roomId).SendAsync("GameStarted", gameState);
        SyncPhaseTimer(roomId, room);
    }

    // Per-round topic selection — the designated player picks the topic for this round
    // Accepts (roomId, topic) or (roomId, sessionId, topic) — frontend may send either
    public async Task SelectRoundTopic(string roomId, string sessionIdOrTopic, string? topic = null)
    {
        var room = _game.GetRoom(roomId);

        // Support both 2-arg (roomId, topic) and 3-arg (roomId, sessionId, topic) calls
        string sessionId;
        string topicToSelect;
        if (topic != null)
        {
            sessionId = sessionIdOrTopic;
            topicToSelect = topic;
        }
        else
        {
            sessionId = string.Empty;
            topicToSelect = sessionIdOrTopic;
        }

        if (!_game.SelectRoundTopic(room, Context.ConnectionId, sessionId, topicToSelect))
        {
            await Clients.Caller.SendAsync("TopicSelectionFailed", new { message = "Unable to select this topic. Ensure it is your turn and questions exist." });
            return;
        }

        var gameState = _game.GetGameState(room);
        await Clients.Group(roomId).SendAsync("GameStarted", gameState);
        SyncPhaseTimer(roomId, room);
    }

    public async Task<object> SubmitFakeAnswer(string roomId, string fake)
    {
        var room = _game.GetRoom(roomId);

        if (!_game.SubmitFakeAnswer(room, Context.ConnectionId, fake, out var errorMessage))
        {
            return new
            {
                success = false,
                message = errorMessage
            };
        }

        if (_game.AllFakeAnswersSubmitted(room))
        {
            room.Phase = GamePhase.ChoosingAns;
            _game.RefreshPhaseDeadline(room);
            var choices = _game.BuildAnswerChoices(room);

            await SendShowChoices(roomId, room, choices);
            SyncPhaseTimer(roomId, room);
        }

        return new
        {
            success = true
        };
    }

    public async Task ChooseAnswer(string roomId, string answer)
    {
        var room = _game.GetRoom(roomId);
        if (room.Phase != GamePhase.ChoosingAns)
            return;

        _game.SubmitChosenAnswer(room, Context.ConnectionId, answer);

        if (room.ChosenAnswers.Count == room.Players.Count)
        {
            _game.ScoreRound(room);
            room.Phase = GamePhase.ShowingRanking;
            _game.RefreshPhaseDeadline(room);

            var gameState = _game.GetGameState(room);
            await Clients.Group(roomId).SendAsync("RoundEnded", gameState);
            SyncPhaseTimer(roomId, room);
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
            SyncPhaseTimer(roomId, room);
        }
        else
        {
            var gameState = _game.GetGameState(room);
            await Clients.Group(roomId).SendAsync("GameEnded", gameState);
            CancelPhaseTimer(roomId);

            // Save game session to database when game ends
            await _game.SaveGameSession(room);
        }
    }

}
