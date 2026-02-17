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
    private readonly QuestionsService _questionsService;

    public RoomController(GameManager game, AppDbContext context, QuestionsService questionsService)
    {
        _game = game;
        _context = context;
        _questionsService = questionsService;
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
        Player gamePlayer;

        // Handle guest players (PlayerId = -1)
        if (request.PlayerId == -1)
        {
            gamePlayer = new Player
            {
                Id = -1,
                Username = "Guest",
                AvatarImageName = "🎮",
                XP = 0,
                ConnectionId = "" // Will be set when the player connects via SignalR
            };
        }
        else
        {
            // Get player from database using playerId
            var player = _context.Players.FirstOrDefault(p => p.Id == request.PlayerId);
            if (player == null)
            {
                return BadRequest(new { error = "Player not found." });
            }

            // Create a runtime player object (with ConnectionId set later via SignalR)
            gamePlayer = new Player
            {
                Id = player.Id,
                Username = player.Username,
                AvatarImageName = player.AvatarImageName,
                XP = player.XP,
                ConnectionId = "" // Will be set when the player connects via SignalR
            };
        }

        if (!_game.JoinRoom(request.RoomId, gamePlayer))
        {
            return BadRequest(new { error = "Unable to join room." });
        }

        return Ok(new { roomId = request.RoomId, playerId = gamePlayer.Id, playerName = gamePlayer.Username });
    }

    // GET api/room/topics
    // NOTE: This MUST be before {roomId} route to avoid "topics" being interpreted as a roomId
    [HttpGet("topics")]
    public IActionResult GetTopics()
    {
        var topics = _questionsService.GetTopics();
        return Ok(topics);
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
    public List<string> Topics { get; set; } = new List<string>();
}

public class JoinRoomRequest
{
    public string RoomId { get; set; } = "";
    public int PlayerId { get; set; } // Use Player ID from database instead of name
}
