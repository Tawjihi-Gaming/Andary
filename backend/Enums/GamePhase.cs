//Prevent bugs caused by magic strings.

namespace Backend.Enums;

public enum GamePhase
{
    Lobby,
    ChoosingTopic,
    ChoosingRoundTopic, // Per-round: next player picks topic for the next question
    CollectingAns,
    ChoosingAns,
    ShowingRanking,
    GameEnded
}