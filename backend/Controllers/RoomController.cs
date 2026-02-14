// REST API for pre-game actions (before WebSocket/SignalR is needed).

using Microsoft.AspNetCore.Mvc;
using backend.Services;
using backend.Models;
using backend.Enums;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomController : ControllerBase
{
    private readonly GameManager _game;

    public RoomController(GameManager game)
    {
        _game = game;
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
        var player = new Player
        {
            ConnectionId = "", // Will be set when the player connects via SignalR
            Name = request.Name
        };

        if (!_game.JoinRoom(request.RoomId, player))
        {
            return BadRequest(new { error = "Unable to join room." });
        }

        return Ok(new { roomId = request.RoomId, playerName = request.Name });
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
                players = room.Players.Select(p => p.Name),
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
    public string Name { get; set; } = "";
}
