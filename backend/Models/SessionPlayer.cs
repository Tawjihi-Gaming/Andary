namespace backend.Models;

public class SessionPlayer
{
    public string PlayerId { get; } // session-scoped identifier
    public string DisplayName { get; set; }
    public string Avatar { get; set; }
    public int Score { get; set; }
    public bool IsReady { get; set; }
    public bool IsConnected { get; set; }

    public SessionPlayer(string playerId, string displayName, string avatar)
    {
        if (string.IsNullOrWhiteSpace(playerId))
            throw new ArgumentException("Player ID cannot be empty", nameof(playerId));
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name cannot be empty", nameof(displayName));

        PlayerId = playerId;
        DisplayName = displayName;
        Avatar = avatar ?? string.Empty;
        Score = 0;
        IsReady = false;
        IsConnected = true;
    }

    public void AddScore(int points)
    {
        Score += points;
    }
}
