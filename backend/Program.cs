using backend.Services;
using backend.Hubs;
using backend.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// DbContext
// var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
// builder.Services.AddDbContext<AppDbContext>(options =>
//     options.UseNpgsql(connectionString));

// DbContext — In-Memory for development, PostgreSQL for production
//remove it when database get ready
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseInMemoryDatabase("AndaryDevDb"));
}
else
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));
}

// SignalR
builder.Services.AddSignalR();

// Game services
builder.Services.AddSingleton<GameManager>();
builder.Services.AddScoped<QuestionsService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                  "http://localhost:3000", "https://localhost:3000",
                  "http://127.0.0.1:3000", "https://127.0.0.1:3000",
                  "http://localhost:8080", "https://localhost:8080")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Seed test data for development (in-memory DB)
//remove it when database get ready
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    if (!db.Players.Any())
    {
        db.Players.Add(new backend.Models.Player
        {
            Id = 1,
            Username = "TestPlayer",
            AvatarImageName = "avatar1.png",
            TotalXP = 0
        });
        db.Players.Add(new backend.Models.Player
        {
            Id = 2,
            Username = "TestPlayer2",
            AvatarImageName = "avatar2.png",
            TotalXP = 0
        });
        db.SaveChanges();
    }
}

// Pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.UseCors();

// REST API endpoints
app.MapControllers();

// SignalR hub
app.MapHub<GameHub>("/gamehub");

app.Run();
