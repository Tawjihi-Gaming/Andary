using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

//This class is where you define the methods
//the client is allowed to ask for.
//Hub is a class in .NET
//What does Hub secretly give you?
// 1. Clients → a gateway to all connected clients
// 2. Context → who is calling, connection id, user info
// 3. Lifetime hooks → connect / disconnect

//Why public methods only?
//Only public methods on a Hub can be called by clients.
public class GameHub : Hub
{
    // This is a method the client can call
    public async Task ping()
    {
        Console.WriteLine("Ping received from client");

        // Send a message back to the calling client
        await Clients.Caller.SendAsync("Pong");
    }

}