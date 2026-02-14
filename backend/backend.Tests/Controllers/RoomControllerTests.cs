using Xunit;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Controllers;
using backend.Services;
using backend.Models;
using backend.Data;
using backend.Enums;

namespace backend.Tests.Controllers;

public class RoomControllerTests
{
    private readonly RoomController _controller;
    private readonly GameManager _game;
    private readonly AppDbContext _context;

    public RoomControllerTests()
    {
        // Use an InMemory database so no real PostgreSQL is needed
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _game = new GameManager(_context);
        _controller = new RoomController(_game, _context);
    }

    // ── CreateRoom ──────────────────────────────────────────

    [Fact]
    public void CreateRoom_Public_ReturnsOkWithRoomId()
    {
        var request = new CreateRoomRequest { IsPrivate = false, Questions = 5 };

        var result = _controller.CreateRoom(request) as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public void CreateRoom_Private_ReturnsOkWithCode()
    {
        var request = new CreateRoomRequest { IsPrivate = true, Questions = 3 };

        var result = _controller.CreateRoom(request) as OkObjectResult;

        Assert.NotNull(result);
        // Private rooms should have a code
        var value = result.Value!;
        var codeProp = value.GetType().GetProperty("code");
        Assert.NotNull(codeProp);
        Assert.NotNull(codeProp.GetValue(value));
    }

    // ── JoinRoom ────────────────────────────────────────────

    [Fact]
    public void JoinRoom_PlayerNotFound_ReturnsBadRequest()
    {
        // No player in database
        var request = new JoinRoomRequest { RoomId = "room1", PlayerId = 999 };

        var result = _controller.JoinRoom(request) as BadRequestObjectResult;

        Assert.NotNull(result);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public void JoinRoom_ValidPlayer_ReturnsOk()
    {
        // Seed a player in the InMemory database
        var player = new Player { Id = 1, Username = "Alice", AvatarImageName = "avatar1", XP = 0 };
        _context.Players.Add(player);
        _context.SaveChanges();

        // First create a room
        var room = _game.CreateRoom(RoomType.Public, 5);

        var request = new JoinRoomRequest { RoomId = room.RoomId, PlayerId = 1 };

        var result = _controller.JoinRoom(request) as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public void JoinRoom_InvalidRoomId_ReturnsBadRequest()
    {
        // Seed a player
        var player = new Player { Id = 2, Username = "Bob", AvatarImageName = "avatar2", XP = 0 };
        _context.Players.Add(player);
        _context.SaveChanges();

        var request = new JoinRoomRequest { RoomId = "nonexistent", PlayerId = 2 };

        var result = _controller.JoinRoom(request) as BadRequestObjectResult;

        Assert.NotNull(result);
    }

    // ── GetRoom ─────────────────────────────────────────────

    [Fact]
    public void GetRoom_ExistingRoom_ReturnsOk()
    {
        var room = _game.CreateRoom(RoomType.Public, 5);

        var result = _controller.GetRoom(room.RoomId) as OkObjectResult;

        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public void GetRoom_NonExistingRoom_ReturnsNotFound()
    {
        var result = _controller.GetRoom("does-not-exist") as NotFoundObjectResult;

        Assert.NotNull(result);
        Assert.Equal(404, result.StatusCode);
    }
}