namespace backend.Models;

public class GameParticipant
{
    public int Id { get; set; }
    public int GameSessionId { get; set; }
    public int PlayerId { get; set; }
    public int FinalScore { get; set; }
    public int FinalRank { get; set; }
}
