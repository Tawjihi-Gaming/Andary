// Temporary in-game identity. Lives only in memory during a game session.
// Not persisted to the database — created when a player joins a room,
// destroyed when the game ends.
// If the player is logged in (has a DB account), PlayerId links them
// so stats can be saved after the game.

namespace Backend.Models;

public class SessionPlayer
{
    // Unique identifier for this session (generated when joining a room)
    public string SessionId { get; set; } = Guid.NewGuid().ToString();

    // Display name chosen by the player (can be anonymous)
    public string DisplayName { get; set; } = "";

    // Avatar chosen for this session
    public string AvatarImageName { get; set; } = "";

    // SignalR connection ID (set when WebSocket connects)
    public string ConnectionId { get; set; } = "";

    // Score accumulated during this game session only
    public int Score { get; set; }

    // Whether the player is ready in the lobby (before game starts)
    public bool IsReady { get; set; }

    // Gameplay state flags (reset each round)
    public bool HasSubmittedFake { get; set; }
    public bool HasChosenAnswer { get; set; }

    // Nullable — links to the DB Player if the user is logged in.
    // null = anonymous/guest player.
    // If set, the game can save stats to the Player's account after the game ends.
    public int? PlayerId { get; set; }

    // Browser-level identity key used for guest deduplication.
    public string? ClientKey { get; set; }
}
