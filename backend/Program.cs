using backend.Services;
using backend.Hubs;
using backend.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add DbContext with connection string from appsettings
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

//enable SignalR (used only during gameplay)
builder.Services.AddSignalR();

//enable REST API controllers (used for pre-game: create/join room)
builder.Services.AddControllers();

builder.Services.AddScoped<GameManager>();
builder.Services.AddScoped<QuestionsService>();

// CORS for frontend dev server
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors();

//This does not open WebSockets.
//It does not accept connections yet.
//It just says:
//“If someone wants a SignalR connection at
//gamehub, use GameHub.”

//Imagine the browser says:
//“Hello server, I want to open a SignalR connection.”
//The server must answer two questions:
// 1. At what URL?
// 2. Which hub handles it?

//“If a request comes to /gamehub
//and it is a SignalR negotiation / connection
//then use GameHub to handle it.”

//This is NOT a normal HTTP endpoint
//This is not like:
//app.MapGet("/gamehub", () => "Hello");
//Key difference:
// 1. MapGet → one request → one response → done
// 2. MapHub → negotiate → connect → stay open → exchange messages

//MapHub<>()
//MapHub<T> is a generic method provided by SignalR.
//T is the hub class you want to expose.
//what this function do?
//app.MapHub<GameHub>("/gamehub") tells your server:
//“Here is a hub class GameHub. If anyone connects to /gamehub,
//create a hub instance and let clients call its allowed methods
//and receive messages.”


// REST API endpoints (pre-game: create room, join room)
app.MapControllers();

// SignalR hub (in-game real-time communication only)
app.MapHub<GameHub>("/gamehub");

app.Run();