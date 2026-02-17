// REST API for pre-game actions (before WebSocket/SignalR is needed).

using Microsoft.AspNetCore.Mvc;
using backend.Services;
using backend.Models;
using backend.Enums;
using backend.Data;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomController : ControllerBase
{
    private readonly GameManager _game;
    private readonly AppDbContext _context;

    public RoomController(GameManager game, AppDbContext context)
    {
        _game = game;
        _context = context;
    }

    // POST api/room/create
    // Creates a room and automatically joins the creator as the owner.
    [HttpPost("create")]
    public IActionResult CreateRoom([FromBody] CreateRoomRequest request)
    {
        if (string.IsNullOrEmpty(request.PlayerName))
            return BadRequest(new { error = "Player name is required." });

        if (string.IsNullOrEmpty(request.Name))
            return BadRequest(new { error = "Room name is required." });

        RoomType type = request.IsPrivate ? RoomType.Private : RoomType.Public;

        // Create the owner's SessionPlayer
        var creator = new SessionPlayer
        {
            DisplayName = request.PlayerName,
            AvatarImageName = request.AvatarImageName ?? ""
        };

        // If the creator is logged in, link their DB account
        if (request.PlayerId.HasValue)
        {
            var dbPlayer = _context.Players.FirstOrDefault(p => p.Id == request.PlayerId.Value);
            if (dbPlayer == null)
                return BadRequest(new { error = "Player not found." });

            creator.PlayerId = dbPlayer.Id;
            creator.DisplayName = dbPlayer.Username;
            creator.AvatarImageName = dbPlayer.AvatarImageName;
        }

        var (room, owner) = _game.CreateRoom(type, request.Questions, request.Name, creator);

        return Ok(new
        {
            roomId = room.RoomId,
            code = room.Code,
            name = room.Name,
            sessionId = owner.SessionId,
            playerName = owner.DisplayName
        });
    }

    // POST api/room/join
    // Supports both logged-in players (with PlayerId) and anonymous guests.
    [HttpPost("join")]
    public IActionResult JoinRoom([FromBody] JoinRoomRequest request)
    {
        Room? room = null;

        // If a code is provided, look up the room by code (join-by-code)
        if (!string.IsNullOrEmpty(request.Code))
        {
            room = _game.GetRoomByCode(request.Code);
            if (room == null)
                return BadRequest(new { error = "Invalid room code." });
        }
        // Otherwise, look up by RoomId (public rooms only)
        else if (!string.IsNullOrEmpty(request.RoomId))
        {
            try
            {
                room = _game.GetRoom(request.RoomId);
            }
            catch
            {
                return BadRequest(new { error = "Room not found." });
            }

            // Private rooms can only be joined by code, not by roomId
            if (room.Type == RoomType.Private)
                return BadRequest(new { error = "Private rooms can only be joined using the room code." });
        }
        else
        {
            return BadRequest(new { error = "Provide a room code or room ID." });
        }

        // A display name is always required
        if (string.IsNullOrEmpty(request.PlayerName))
            return BadRequest(new { error = "Player name is required." });

        // Create a session player (temporary, in-memory only)
        var sessionPlayer = new SessionPlayer
        {
            DisplayName = request.PlayerName,
            AvatarImageName = request.AvatarImageName ?? "",
            ConnectionId = "" // Will be set when the player connects via SignalR
        };

        // If the player is logged in, link their DB account
        if (request.PlayerId.HasValue)
        {
            var dbPlayer = _context.Players.FirstOrDefault(p => p.Id == request.PlayerId.Value);
            if (dbPlayer == null)
                return BadRequest(new { error = "Player not found." });

            sessionPlayer.PlayerId = dbPlayer.Id;
            sessionPlayer.DisplayName = dbPlayer.Username;
            sessionPlayer.AvatarImageName = dbPlayer.AvatarImageName;
        }

        if (!_game.JoinRoom(room.RoomId, sessionPlayer))
        {
            return BadRequest(new { error = "Unable to join room. The room may be full (max " + Room.MaxPlayers + " players)." });
        }

        return Ok(new
        {
            roomId = room.RoomId,
            sessionId = sessionPlayer.SessionId,
            playerName = sessionPlayer.DisplayName
        });
    }

    // GET api/room/{roomId}
    [HttpGet("{roomId}")]
    public IActionResult GetRoom(string roomId)
    {
        try
        {
            var room = _game.GetRoom(roomId);
            return Ok(new
            {
                roomId = room.RoomId,
                name = room.Name,
                code = room.Code,
                ownerSessionId = room.OwnerSessionId,
                phase = room.Phase.ToString(),
                players = room.Players.Select(p => new { sessionId = p.SessionId, name = p.DisplayName, score = p.Score, isReady = p.IsReady }),
                totalQuestions = room.TotalQuestions,
                selectedTopics = room.SelectedTopics
            });
        }
        catch
        {
            return NotFound(new { error = "Room not found." });
        }
    }
}

// Request DTOs
public class CreateRoomRequest
{
    public bool IsPrivate { get; set; }
    public int Questions { get; set; }
    public string? Name { get; set; } // Required — room display name
    public string? PlayerName { get; set; } // Creator's display name (required)
    public string? AvatarImageName { get; set; } // Creator's avatar
    public int? PlayerId { get; set; } // Optional — set if the creator is logged in
}

public class JoinRoomRequest
{
    public string? RoomId { get; set; } // Optional when joining by code
    public int? PlayerId { get; set; } // Optional — set if the player is logged in (DB account)
    public string? PlayerName { get; set; } // Display name (required for anonymous, optional for logged-in)
    public string? AvatarImageName { get; set; } // Optional avatar
    public string? Code { get; set; } // Provide this to join a private room by code
}
