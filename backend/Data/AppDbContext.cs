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
		public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
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

			modelBuilder.Entity<PasswordResetToken>()
				.HasOne(t => t.Player)
				.WithMany(p => p.PasswordResetTokens)
				.HasForeignKey(t => t.PlayerId)
				.OnDelete(DeleteBehavior.Cascade);

			modelBuilder.Entity<AuthLocal>()
			.HasIndex(a => a.Email)
			.IsUnique();

			modelBuilder.Entity<AuthOAuth>()
			.HasIndex(a => new { a.Provider, a.ProviderUserId })
			.IsUnique();
		}
    }
}
