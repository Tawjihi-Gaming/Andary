namespace backend.Models;

public class GameSession
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? FinishedAt { get; set; }
    public int TotalRounds { get; set; }
    public string GameConfigSnapshot { get; set; } = ""; // JSON snapshot of game config
}
