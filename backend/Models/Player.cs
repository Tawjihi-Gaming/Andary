//Pure data. No behavior.

namespace backend.Models;

//get -> reading the value
//set -> changing the value

//public bool HasChosenAnswer { get; set; }
/*
    public bool HasChosenAnswer
    {
        get { return _hasChosenAnswer; }
        set { _hasChosenAnswer = value; }
    }
*/

//When the server creates a player:
//var player = new Player();
//C# automatically sets:
//player.HasChosenAnswer == false

public class Player
{
    public string ConnectionId {get; set;}
    public string Name {get; set;}

    public int Score {get; set;}
    public int XP {get; set;}

    public bool HasSubmittedFake {get; set;}
    public bool HasChosenAnswer {get; set;}
}