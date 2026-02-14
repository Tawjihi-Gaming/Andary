using Xunit;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Tests.Data;

public class AppDbContextTests
{
    private AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    // ── Players ─────────────────────────────────────────────

    [Fact]
    public void CanInsertAndRetrievePlayer()
    {
        using var context = CreateContext();

        var player = new Player
        {
            Id = 1,
            Username = "Alice",
            AvatarImageName = "avatar1",
            XP = 0
        };
        context.Players.Add(player);
        context.SaveChanges();

        var retrieved = context.Players.Find(1);
        Assert.NotNull(retrieved);
        Assert.Equal("Alice", retrieved.Username);
        Assert.Equal("avatar1", retrieved.AvatarImageName);
    }

    [Fact]
    public void CanUpdatePlayerXP()
    {
        using var context = CreateContext();

        var player = new Player { Id = 1, Username = "Bob", AvatarImageName = "av2", XP = 0 };
        context.Players.Add(player);
        context.SaveChanges();

        player.XP = 10;
        context.SaveChanges();

        var updated = context.Players.Find(1);
        Assert.NotNull(updated);
        Assert.Equal(10, updated.XP);
    }

    // ── Topics ──────────────────────────────────────────────

    [Fact]
    public void CanInsertAndRetrieveTopic()
    {
        using var context = CreateContext();

        var topic = new Topic { Id = 1, Name = "Science" };
        context.Topics.Add(topic);
        context.SaveChanges();

        var retrieved = context.Topics.Find(1);
        Assert.NotNull(retrieved);
        Assert.Equal("Science", retrieved.Name);
    }

    // ── Questions ───────────────────────────────────────────

    [Fact]
    public void CanInsertAndRetrieveQuestion()
    {
        using var context = CreateContext();

        var topic = new Topic { Id = 1, Name = "History" };
        context.Topics.Add(topic);

        var question = new Question
        {
            Id = 1,
            TopicId = 1,
            Text = "Who discovered America?",
            CorrectAnswer = "Columbus",
            Explanation = "In 1492",
            Topic = topic
        };
        context.Questions.Add(question);
        context.SaveChanges();

        var retrieved = context.Questions.Find(1);
        Assert.NotNull(retrieved);
        Assert.Equal("Who discovered America?", retrieved.Text);
        Assert.Equal("Columbus", retrieved.CorrectAnswer);
        Assert.Equal(1, retrieved.TopicId);
    }

    // ── GameSessions & GameParticipants ─────────────────────

    [Fact]
    public void CanInsertGameSessionAndParticipants()
    {
        using var context = CreateContext();

        // Create player
        var player = new Player { Id = 1, Username = "Alice", AvatarImageName = "av1", XP = 5 };
        context.Players.Add(player);

        // Create game session
        var session = new GameSession
        {
            Id = 1,
            TotalRounds = 5,
            FinishedAt = DateTime.UtcNow,
            GameConfigSnapshot = "{\"Topic\":\"Science\"}"
        };
        context.GameSessions.Add(session);

        // Create participant
        var participant = new GameParticipant
        {
            Id = 1,
            GameSessionId = 1,
            PlayerId = 1,
            FinalScore = 5,
            FinalRank = 1
        };
        context.GameParticipants.Add(participant);
        context.SaveChanges();

        Assert.Single(context.GameSessions);
        Assert.Single(context.GameParticipants);

        var retrievedSession = context.GameSessions.Find(1);
        Assert.NotNull(retrievedSession);
        Assert.Equal(5, retrievedSession.TotalRounds);

        var retrievedParticipant = context.GameParticipants.Find(1);
        Assert.NotNull(retrievedParticipant);
        Assert.Equal(1, retrievedParticipant.FinalRank);
    }

    // ── AuthLocal ───────────────────────────────────────────

    [Fact]
    public void CanInsertAuthLocal()
    {
        using var context = CreateContext();

        var player = new Player { Id = 1, Username = "Charlie", AvatarImageName = "av3", XP = 0 };
        context.Players.Add(player);

        var auth = new AuthLocal
        {
            Id = 1,
            PasswordHash = "hashedpassword123"
        };
        context.AuthLocal.Add(auth);
        context.SaveChanges();

        var retrieved = context.AuthLocal.Find(1);
        Assert.NotNull(retrieved);
        Assert.Equal("hashedpassword123", retrieved.PasswordHash);
    }

    // ── Delete ──────────────────────────────────────────────

    [Fact]
    public void CanDeletePlayer()
    {
        using var context = CreateContext();

        var player = new Player { Id = 1, Username = "DeleteMe", AvatarImageName = "av", XP = 0 };
        context.Players.Add(player);
        context.SaveChanges();

        context.Players.Remove(player);
        context.SaveChanges();

        Assert.Null(context.Players.Find(1));
    }
}