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
    [HttpPost("create")]
    public IActionResult CreateRoom([FromBody] CreateRoomRequest request)
    {
        RoomType type = request.IsPrivate ? RoomType.Private : RoomType.Public;

        var room = _game.CreateRoom(type, request.Questions);

        return Ok(new { roomId = room.RoomId, code = room.Code });
    }

    // POST api/room/join
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
        // Otherwise, look up by RoomId (public rooms)
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
        }
        else
        {
            return BadRequest(new { error = "Provide a room code or room ID." });
        }

        // Get player from database using playerId
        var player = _context.Players.FirstOrDefault(p => p.Id == request.PlayerId);
        if (player == null)
        {
            return BadRequest(new { error = "Player not found." });
        }

        // Create a runtime player object (with ConnectionId set later via SignalR)
        var gamePlayer = new Player
        {
            Id = player.Id,
            Username = player.Username,
            AvatarImageName = player.AvatarImageName,
            XP = player.XP,
            ConnectionId = "" // Will be set when the player connects via SignalR
        };

        if (!_game.JoinRoom(room.RoomId, gamePlayer))
        {
            return BadRequest(new { error = "Unable to join room." });
        }

        return Ok(new { roomId = room.RoomId, playerId = player.Id, playerName = player.Username });
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
                code = room.Code,
                phase = room.Phase.ToString(),
                players = room.Players.Select(p => new { id = p.Id, name = p.Username, xp = p.XP }),
                totalQuestions = room.TotalQuestions
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
}

public class JoinRoomRequest
{
    public string? RoomId { get; set; } // Optional when joining by code
    public int PlayerId { get; set; } // Use Player ID from database instead of name
    public string? Code { get; set; } // Provide this to join a private room by code
}
