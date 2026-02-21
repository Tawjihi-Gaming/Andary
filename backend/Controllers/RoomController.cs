// REST API for pre-game actions (before WebSocket/SignalR is needed).

using Microsoft.AspNetCore.Mvc;
using Backend.Services;
using Backend.Models;
using backend.Enums;
using Backend.Data;

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
            AvatarImageName = request.AvatarImageName ?? "",
            ClientKey = string.IsNullOrWhiteSpace(request.ClientKey) ? null : request.ClientKey.Trim()
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

        // Add topics selected during room creation (needed for StartGame)
        if (request.SelectedTopics != null)
        {
            foreach (var topic in request.SelectedTopics.Take(7)) // max 7 topics per room
            {
                if (!string.IsNullOrWhiteSpace(topic))
                    _game.AddTopic(room, topic.Trim());
            }
        }

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
            ConnectionId = "", // Will be set when the player connects via SignalR
            ClientKey = string.IsNullOrWhiteSpace(request.ClientKey) ? null : request.ClientKey.Trim()
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

        var joinResult = _game.JoinRoom(room.RoomId, sessionPlayer);
        if (joinResult != JoinRoomResult.Success)
        {
            return joinResult switch
            {
                JoinRoomResult.DuplicateAccount => BadRequest(new { error = "This account is already in the room." }),
                JoinRoomResult.DuplicateGuest => BadRequest(new { error = "This guest session is already in the room." }),
                JoinRoomResult.RoomFull => BadRequest(new { error = "Unable to join room. The room may be full (max " + Room.MaxPlayers + " players)." }),
                JoinRoomResult.NotInLobby => BadRequest(new { error = "Unable to join room after the game has started." }),
                _ => BadRequest(new { error = "Unable to join room." })
            };
        }

        return Ok(new
        {
            roomId = room.RoomId,
            sessionId = sessionPlayer.SessionId,
            playerName = sessionPlayer.DisplayName
        });
    }

    // GET api/room/{roomId}
    // Room IDs are generated as GUID strings.
    [HttpGet("{roomId:guid}")]
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

    // GET api/room/topics
    [HttpGet("topics")]
    public IActionResult GetTopics()
    {
        try
        {
            var topics = _questionsService.GetTopics();
            return Ok(topics);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                error = "Failed to fetch topics from database.",
                details = ex.Message
            });
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
    public string? ClientKey { get; set; } // Browser identity key (used for guest deduplication)
    public List<string>? SelectedTopics { get; set; } // Topics chosen at room creation (min 1 to start game)
}

public class JoinRoomRequest
{
    public string? RoomId { get; set; } // Optional when joining by code
    public int? PlayerId { get; set; } // Optional — set if the player is logged in (DB account)
    public string? PlayerName { get; set; } // Display name (required for anonymous, optional for logged-in)
    public string? AvatarImageName { get; set; } // Optional avatar
    public string? ClientKey { get; set; } // Browser identity key (used for guest deduplication)
    public string? Code { get; set; } // Provide this to join a private room by code
}
