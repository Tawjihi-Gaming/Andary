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
        // Check if room exists
        Room room;
        try
        {
            room = _game.GetRoom(request.RoomId);
        }
        catch
        {
            return BadRequest(new { error = "Room not found." });
        }

        // If private room, verify the code
        if (room.Type == RoomType.Private)
        {
            if (string.IsNullOrEmpty(request.Code) || request.Code != room.Code)
            {
                return BadRequest(new { error = "Invalid room code." });
            }
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

        if (!_game.JoinRoom(request.RoomId, gamePlayer))
        {
            return BadRequest(new { error = "Unable to join room." });
        }

        return Ok(new { roomId = request.RoomId, playerId = player.Id, playerName = player.Username });
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
    public string RoomId { get; set; } = "";
    public int PlayerId { get; set; } // Use Player ID from database instead of name
    public string? Code { get; set; } // Required for private rooms
}
