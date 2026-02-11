var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSignalR();
var app = builder.Build();

// Enable serving static files from wwwroot
app.UseStaticFiles();

// Serve index.html at the root URL
app.UseDefaultFiles();
app.UseStaticFiles();

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
app.MapHub<GameHub>("/gamehub");

app.Run();