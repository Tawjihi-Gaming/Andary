//Pure data. Maps to players table in database.

namespace backend.Models;

public class Player
{
    // Database fields
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string AvatarImageName { get; set; } = "";
    public int XP { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Runtime fields (not persisted to DB)
    public string ConnectionId { get; set; } = "";

    public bool HasSubmittedFake { get; set; }
    public bool HasChosenAnswer { get; set; }
}