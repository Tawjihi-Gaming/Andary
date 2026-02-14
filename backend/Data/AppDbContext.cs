using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

//DbContext is the class that EF Core uses to talk to the database.
//It knows all the tables (via DbSet<T>).
//It tracks changes you make to objects.
public class AppDbContext : DbContext
{
    //The options parameter tells EF Core how to connect to the database.
    //: base(options)
    // - Means “take these options and pass them to the parent class (DbContext)”.
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Database tables
    //DbSet<Topic> → lets you query/update the Topics table

    //What DbSet is
    // - DbSet<T> is like a collection of objects in your database.
    // - Each DbSet represents a table.
    /*
        This line defines the table in your C# code and tells EF Core that
        the table Topics will contain rows of type Topic (with columns Id, Name,
        CreatedAt). EF Core will handle creating the actual table in the database.
    */

    public DbSet<Topic> Topics { get; set; } 
    public DbSet<Question> Questions { get; set; }
    public DbSet<Player> Players { get; set; }

    //AuthLocal = stores local login info (username/password) for a player.
    public DbSet<AuthLocal> AuthLocal { get; set; }
    public DbSet<AuthOAuth> AuthOAuth { get; set; }
    public DbSet<GameSession> GameSessions { get; set; }
    public DbSet<GameParticipant> GameParticipants { get; set; }

    //This method tells EF Core how your tables should look and how they relate to each other.
    //You don’t call it manually – EF Core calls it automatically when
    // it builds its internal database model.
    //EF Core uses it to:
    // 1. Know primary keys
    // 2.Know foreign key relationships (how tables are connected)
    // 3. Generate SQL for migrations or queries
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        //Always call the base version first.
        //base → refers to the parent class of your AppDbContext, which is DbContext.
        //By calling it, you preserve those defaults before
        // adding your own custom configuration.
        base.OnModelCreating(modelBuilder);

        // Topics
        modelBuilder.Entity<Topic>() //we are configuring the table for Topic
            .HasKey(t => t.Id); //Id is the primary key

        // Questions
        //This sets up a one-to-many relationship: one Topic → many Questions.
        modelBuilder.Entity<Question>()
            .HasKey(q => q.Id);
        modelBuilder.Entity<Question>()
            .HasOne<Topic>() //each Question belongs to one Topic.
            .WithMany() //a Topic can have many Questions.
            .HasForeignKey("TopicId"); //FK (TopicId) in question table point to topic table
        
        // Players
        modelBuilder.Entity<Player>()
            .HasKey(p => p.Id);

        // AuthLocal
        //one Player → many AuthLocal accounts
        modelBuilder.Entity<AuthLocal>()
            .HasKey(a => a.Id);
        modelBuilder.Entity<AuthLocal>()
            .HasOne<Player>()
            .WithMany()
            .HasForeignKey("PlayerId");

        // AuthOAuth
        //Each OAuth account belongs to one Player.
        modelBuilder.Entity<AuthOAuth>()
            .HasKey(a => a.Id);
        modelBuilder.Entity<AuthOAuth>()
            .HasOne<Player>()
            .WithMany()
            .HasForeignKey("PlayerId");

        // GameSessions
        modelBuilder.Entity<GameSession>()
            .HasKey(g => g.Id);

        // GameParticipants
        //GameParticipants = join table connecting Players and GameSessions.
        //This allows many-to-many relationships: a game can have many
        // players, a player can join many games.
        modelBuilder.Entity<GameParticipant>()
            .HasKey(g => g.Id);
        modelBuilder.Entity<GameParticipant>()
            .HasOne<GameSession>()
            .WithMany()
            .HasForeignKey("GameSessionId");
        modelBuilder.Entity<GameParticipant>()
            .HasOne<Player>()
            .WithMany()
            .HasForeignKey("PlayerId");
    }
}
