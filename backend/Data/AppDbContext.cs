using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}
        public DbSet<Player> Players { get; set; }
        public DbSet<AuthLocal> AuthLocals { get; set; }
        public DbSet<AuthOAuth> AuthOAuths { get; set; }
        public DbSet<GameParticipant> GameParticipants { get; set; }
        public DbSet<GameSession> GameSessions { get; set; }
        public DbSet<Topic> Topics { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<FriendRequest> FriendRequests { get; set; }
        public DbSet<Friend> Friends { get; set; }

		protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
			base.OnModelCreating(modelBuilder);

			// Configure auto-increment for Topics
			modelBuilder.Entity<Topic>()
				.Property(t => t.Id)
				.ValueGeneratedOnAdd();

			// Configure auto-increment for Questions
			modelBuilder.Entity<Question>()
				.Property(q => q.Id)
				.ValueGeneratedOnAdd();

			// Player - AuthLocal (1:1)
			modelBuilder.Entity<Player>()
				.HasOne(p => p.AuthLocal)
				.WithOne(a => a.Player)
				.HasForeignKey<AuthLocal>(a => a.PlayerId)
				.OnDelete(DeleteBehavior.Cascade);

			// Player - AuthOAuth (1:N)
			modelBuilder.Entity<AuthOAuth>()
				.HasOne(a => a.Player)
				.WithMany(p => p.AuthOAuths)
				.HasForeignKey(a => a.PlayerId);

			// Player - GameParticipant
			modelBuilder.Entity<GameParticipant>()
				.HasOne(gp => gp.Player)
				.WithMany(p => p.GameParticipants)
				.HasForeignKey(gp => gp.PlayerId);

			modelBuilder.Entity<GameParticipant>()
				.HasOne(gp => gp.GameSession)
				.WithMany(gs => gs.GameParticipants)
				.HasForeignKey(gp => gp.GameSessionId);

			modelBuilder.Entity<AuthLocal>()
			.HasIndex(a => a.Email)
			.IsUnique();

			modelBuilder.Entity<AuthOAuth>()
			.HasIndex(a => new { a.Provider, a.ProviderUserId })
			.IsUnique();

			// FriendRequest - Sender (Player 1:N)
			modelBuilder.Entity<FriendRequest>()
				.HasOne(fr => fr.Sender)
				.WithMany(p => p.SentRequests)
				.HasForeignKey(fr => fr.SenderId)
				.OnDelete(DeleteBehavior.Restrict);

			// FriendRequest - Receiver (Player 1:N)
			modelBuilder.Entity<FriendRequest>()
				.HasOne(fr => fr.Receiver)
				.WithMany(p => p.ReceivedRequests)
				.HasForeignKey(fr => fr.ReceiverId)
				.OnDelete(DeleteBehavior.Restrict);

			// Composite unique index on (SenderId, ReceiverId)
			modelBuilder.Entity<FriendRequest>()
				.HasIndex(fr => new { fr.SenderId, fr.ReceiverId })
				.IsUnique();

			// Default value for Status
			modelBuilder.Entity<FriendRequest>()
				.Property(fr => fr.Status)
				.HasDefaultValue("pending");

			// Default value for CreatedAt
			modelBuilder.Entity<FriendRequest>()
				.Property(fr => fr.CreatedAt)
				.HasDefaultValueSql("NOW()");

			// Friend - Player1 (Player 1:N)
			modelBuilder.Entity<Friend>()
				.HasOne(f => f.Player1)
				.WithMany(p => p.Friendships)
				.HasForeignKey(f => f.Player1Id)
				.OnDelete(DeleteBehavior.Restrict);

			// Friend - Player2 (no inverse nav to avoid duplicates)
			modelBuilder.Entity<Friend>()
				.HasOne(f => f.Player2)
				.WithMany()
				.HasForeignKey(f => f.Player2Id)
				.OnDelete(DeleteBehavior.Restrict);

			// Composite unique index on (Player1Id, Player2Id)
			modelBuilder.Entity<Friend>()
				.HasIndex(f => new { f.Player1Id, f.Player2Id })
				.IsUnique();

			// Default value for CreatedAt
			modelBuilder.Entity<Friend>()
				.Property(f => f.CreatedAt)
				.HasDefaultValueSql("NOW()");

			// Prevent self-friendship at DB level
			modelBuilder.Entity<Friend>()
				.ToTable(t => t.HasCheckConstraint("CK_Friends_NoSelfFriendship", "\"Player1Id\" <> \"Player2Id\""));
		}
    }
}
