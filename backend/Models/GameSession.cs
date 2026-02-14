namespace backend.Models;

public class GameSession
{
    public string SessionId { get; }
    public List<SessionPlayer> Players { get; } = new();
    public GameConfig Config { get; private set; }
    public GameRound? CurrentRound { get; private set; }
    public int CurrentRoundNumber { get; private set; }
    public GameState State { get; private set; }
    public string OwnerId { get; private set; }

    public GameSession(string sessionId, string ownerId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
            throw new ArgumentException("Session ID cannot be empty", nameof(sessionId));
        if (string.IsNullOrWhiteSpace(ownerId))
            throw new ArgumentException("Owner ID cannot be empty", nameof(ownerId));

        SessionId = sessionId;
        OwnerId = ownerId;
        State = GameState.Lobby;
        CurrentRoundNumber = 0;
        Config = null!; // will be set before game starts
    }

    public void AddPlayer(SessionPlayer player)
    {
        if (State != GameState.Lobby)
            throw new InvalidOperationException("Cannot add players after game has started");

        if (Players.Any(p => p.PlayerId == player.PlayerId))
            throw new InvalidOperationException($"Player {player.PlayerId} is already in the session");

        Players.Add(player);
    }

    public void RemovePlayer(string playerId)
    {
        var player = Players.FirstOrDefault(p => p.PlayerId == playerId);
        if (player != null)
        {
            Players.Remove(player);
        }
    }

    public void MarkPlayerReady(string playerId, bool isReady)
    {
        var player = GetPlayer(playerId);
        player.IsReady = isReady;
    }

    public void SetConfig(GameConfig config)
    {
        if (State != GameState.Lobby)
            throw new InvalidOperationException("Cannot change config after game has started");

        Config = config ?? throw new ArgumentNullException(nameof(config));
    }

    public void StartGame()
    {
        if (State != GameState.Lobby)
            throw new InvalidOperationException("Game has already started");

        if (Config == null)
            throw new InvalidOperationException("Game config must be set before starting");

        if (Players.Count < 2)
            throw new InvalidOperationException("At least 2 players are required to start the game");

        if (!Players.All(p => p.IsReady))
            throw new InvalidOperationException("All players must be ready to start the game");

        State = GameState.Running;
        CurrentRoundNumber = 0;
    }

    public void StartNewRound(string topic, string questionText, string correctAnswer)
    {
        if (State != GameState.Running)
            throw new InvalidOperationException("Game is not running");

        if (CurrentRoundNumber >= Config.TotalRounds)
            throw new InvalidOperationException("All rounds have been completed");

        CurrentRoundNumber++;
        CurrentRound = new GameRound(CurrentRoundNumber, topic, questionText, correctAnswer);
    }

    public void EndCurrentRound()
    {
        if (CurrentRound == null)
            throw new InvalidOperationException("No active round");

        // Apply scores from current round
        var roundScores = CurrentRound.CalculateRoundScores();
        foreach (var (playerId, points) in roundScores)
        {
            var player = GetPlayer(playerId);
            player.AddScore(points);
        }

        CurrentRound = null;
    }

    public void EndGame()
    {
        if (State != GameState.Running)
            throw new InvalidOperationException("Game is not running");

        State = GameState.Finished;
        CurrentRound = null;
    }

    public SessionPlayer GetPlayer(string playerId)
    {
        var player = Players.FirstOrDefault(p => p.PlayerId == playerId);
        if (player == null)
            throw new InvalidOperationException($"Player {playerId} not found in session");
        return player;
    }

    public bool AllPlayersReady()
    {
        return Players.Count > 0 && Players.All(p => p.IsReady);
    }

    public List<SessionPlayer> GetLeaderboard()
    {
        return Players.OrderByDescending(p => p.Score).ToList();
    }
}
