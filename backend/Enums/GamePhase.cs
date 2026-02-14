//Prevent bugs caused by magic strings.

namespace backend.Enums;

public enum GamePhase
{
    Lobby,
    ChoosingTopic,
    CollectingAns,
    ChoosingAns,
    ShowingRanking,
    GameEnded
}