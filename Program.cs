//This brings in the SignalR library.
//It abstracts the transport layer: it will try WebSockets first,
//then fallback to Server-Sent Events (SSE) or
//long-polling if WebSockets aren’t available.
//It provides the Hub abstraction, so you don’t need to manage
//raw WebSocket connections manually.
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSignalR(); // enable SignalR
var app = builder.Build();

app.UseDefaultFiles();  // serve index.html by default
app.UseStaticFiles();   // serve front-end files

// Map SignalR hub endpoint
app.MapHub<QuizHub>("/quiz");

app.Run();

public class QuizHub : Hub
{
    // Minimal hub to enable connection
    public override async Task OnConnectedAsync()
    {
        Console.WriteLine($"Client connected: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"Client disconnected: {Context.ConnectionId}");
        await base.OnDisconnectedAsync(exception);
    }
}
