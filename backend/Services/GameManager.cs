//The game brain.

//GameManager skeleton
using backend.Enums;
using backend.Models;

namespace backend.Services;

public class GameManager
{
    //readonly:
    // - _rooms cannot be reassigned after the constructor or initialization.
    private readonly Dictionary<string, Room> _rooms = new();

    public Room CreateRoom(RoomType type, int totalQuestions)
    {
        var room = new Room();
        room.RoomId = Guid.NewGuid().ToString();
        room.Type = type;

        if (type == RoomType.Private)
            //6 digits
            room.Code = new Random().Next(100000, 999999).ToString();
        else
            room.Code = null;

        room.TotalQuestions = totalQuestions;
        _rooms[room.RoomId] = room;

        return room;
    }

    //Join an existing room
    public bool JoinRoom(string roomId, Player player)
    {
        //_rooms is our dictionary of all rooms.
        // .TryGetValue(roomId, out var room) tries to look up a room by its ID.
        // If it exists → room gets assigned the Room object
        // If it doesn’t → returns false
        if (!_rooms.TryGetValue(roomId, out var room))
            return false;
        //room.Phase tracks the current game phase.
        //Lobby = waiting for players before the game starts.
        //If the room is not in the lobby, the game already started.
        //return false → the player cannot join mid-game.
        if (room.Phase != GamePhase.Lobby)
            return false;
        room.Players.Add(player);
        return true;
    }

    //Get room by id
    public Room GetRoom(string roomId)
    {
        return _rooms[roomId];
    }

    // Set the topic chosen by the player and move to ChoosingTopic phase
    public bool SelectTopic(Room room, string topic)
    {
        //Topic can only be selected during the Lobby phase
        if (room.Phase != GamePhase.Lobby)
            return false;

        room.SelectedTopic = topic;
        room.Phase = GamePhase.ChoosingTopic;
        return true;
    }

    //start game — now uses the selected topic to filter questions
    public void StartGame(Room room, List<Question> questions)
    {
        room.Questions = questions;
        room.Phase = GamePhase.CollectingAns;
        room.CurrentQuestionIndex = 0;
        room.CurrentQuestion = questions[0];
    }

    //Submit fake answer
    public bool SubmitFakeAnswer(Room room, string connectionId, string fake)
    {
        if (room.Phase != GamePhase.CollectingAns)
            return false;

        if (fake == room.CurrentQuestion!.CorrectAnswer)
            return false;

        room.FakeAnswers[connectionId] = fake;
        return true;
    }

    // Check if all players submitted fake answers
    public bool AllFakeAnswersSubmitted(Room room)
    {
        return room.FakeAnswers.Count == room.Players.Count;
    }

    // Build choices (correct + fake)
    public List<string> BuildAnswerChoices(Room room)
    {
        //Takes all the fake answers submitted by players from the room’s dictionary:
        //.Values → gives only the answers, ignoring which player submitted them.
        //.ToList() → converts them into a List<string>, so we can manipulate them easily.
        //Why it’s needed:
        //We need a list of all fake answers to show as choices to the players.
        var answers = room.FakeAnswers.Values.ToList();

        //Adds the correct answer to the list of fake answers.
        //tells “I promise CurrentQuestion is not null here.”
        answers.Add(room.CurrentQuestion!.CorrectAnswer);

        //Shuffles the list of answers randomly.
        //OrderBy(_ => Guid.NewGuid()) → creates a new random order.
        //OrderBy is a LINQ method in C# that sorts a list or collection
        //_ -> This is the parameter that represents each element in the list.
        // Here, we don’t care about the answer itself.
        // We just want a random number for each element.
        //_ is often used when you don’t actually care about the value.
        return answers.OrderBy(_ => Guid.NewGuid()).ToList();
    }

    // Submit chosen answer
    public void SubmitChosenAnswer(Room room, string connectionId, string answer)
    {
        room.ChosenAnswers[connectionId] = answer;
    }

    public void ScoreRound(Room room)
    {
        //Looks up which answer this player chose during the “ChoosingAnswer” phase.
        //We need the player’s choice to score them properly.
        foreach (var player in room.Players)
        {
            var chosen = room.ChosenAnswers[player.ConnectionId];

            //check if the player chose the correct answer
            if (chosen == room.CurrentQuestion!.CorrectAnswer)
                player.XP += 2;

            //Loops through all fake answers submitted by players.
            foreach (var fake in room.FakeAnswers)
            {
                //Checks two things:
                // - Did the player pick this fake answer (fake.Value == chosen)?
                // - Make sure it’s not their own fake (fake.Key != player.ConnectionId)
                if (fake.Value == chosen && fake.Key != player.ConnectionId)
                {
                    //Finds the player who wrote this fake answer.
                    var owner = room.Players.First(player => player.ConnectionId == fake.Key);
                    owner.XP += 1;
                }
            }
        }
    }

    // Advance to next round
    public bool NextRound(Room room)
    {
        room.CurrentQuestionIndex++;
        if (room.CurrentQuestionIndex >= room.TotalQuestions || room.CurrentQuestionIndex >= room.Questions.Count)
        {
            room.Phase = GamePhase.GameEnded;
            return false;
        }
        room.CurrentQuestion = room.Questions[room.CurrentQuestionIndex];
        room.FakeAnswers.Clear();
        room.ChosenAnswers.Clear();
        room.Phase = GamePhase.CollectingAns;
        return true;
    }

    // Build GameState for clients
    public GameState GetGameState(Room room)
    {
        var state = new GameState();
        state.RoomId = room.RoomId;
        state.Phase = room.Phase;
        state.CurrentQuestionIndex = room.CurrentQuestionIndex;
        state.TotalQuestions = room.TotalQuestions;
        state.CurrentQuestion = room.CurrentQuestion!;
        state.Players = room.Players;
        state.RoomCode = room.Code;
        state.SelectedTopic = room.SelectedTopic;

        if (room.Phase == GamePhase.ChoosingAns)
            state.Choices = BuildAnswerChoices(room);
        else
            state.Choices = new List<string>();

        return state;
    }

}
