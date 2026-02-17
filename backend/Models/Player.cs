// Database-only model. Maps to Players table.
// This is the long-term account for logged-in users.
// Runtime game state lives in SessionPlayer (in-memory only).

namespace backend.Models;

public class Player
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string AvatarImageName { get; set; } = "";
    public int TotalXP { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}