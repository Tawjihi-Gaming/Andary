using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Backend.Data;
using Backend.Models;
using Backend.Hubs;
using System.Linq;

namespace Backend.Extensions
{
    public static class AppInfrastructureExtensions
    {
        public static WebApplication UseAppInfrastructure(this WebApplication app)
        {
            app.MapHub<GameHub>("/gamehub");

            SeedDevelopmentData(app);

            return app;
        }

        private static void SeedDevelopmentData(WebApplication app)
        {
            if (!app.Environment.IsDevelopment())
                return;

            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            db.Database.EnsureCreated();

            if (!db.Players.Any())
            {
                db.Players.AddRange(
                    new Player
                    {
                        Username = "rama",
                        AvatarImageName = "avatar1.png",
                        Xp = 0
                    },
                    new Player
                    {
                        Username = "TestPlayer2",
                        AvatarImageName = "avatar2.png",
                        Xp = 0
                    }
                );

                db.SaveChanges();
            }
        }
    }
}
