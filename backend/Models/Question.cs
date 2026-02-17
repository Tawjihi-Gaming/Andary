//Pure data. Maps to questions table in database.

namespace backend.Models;

public class Question
{
    public int Id { get; set; }
    public int TopicId { get; set; }
    public string Text { get; set; } = "";
    public string CorrectAnswer { get; set; } = "";
    public string Explanation { get; set; } = "";
    public string Modifier { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Topic name — populated at runtime when questions are loaded for a game session
    // Not stored in DB, just carried in memory for convenience
    public string TopicName { get; set; } = "";

    // Navigation property for Entity Framework
    public Topic Topic { get; set; } = null!;
}
