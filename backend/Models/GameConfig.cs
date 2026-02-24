namespace backend.Models;

public class GameConfig
{
    public int TotalRounds { get; init; }
    public int FakeAnswerTimeLimitSeconds { get; init; }
    public int AnswerSelectionTimeLimitSeconds { get; init; }
    public List<string> Topics { get; init; } = new();

    public GameConfig(int totalRounds, int fakeAnswerTimeLimit, int answerSelectionTimeLimit, List<string> topics)
    {
        if (totalRounds <= 0)
            throw new ArgumentException("Total rounds must be positive", nameof(totalRounds));
        if (fakeAnswerTimeLimit <= 0)
            throw new ArgumentException("Fake answer time limit must be positive", nameof(fakeAnswerTimeLimit));
        if (answerSelectionTimeLimit <= 0)
            throw new ArgumentException("Answer selection time limit must be positive", nameof(answerSelectionTimeLimit));
        if (topics == null || topics.Count == 0)
            throw new ArgumentException("At least one topic is required", nameof(topics));

        TotalRounds = totalRounds;
        FakeAnswerTimeLimitSeconds = fakeAnswerTimeLimit;
        AnswerSelectionTimeLimitSeconds = answerSelectionTimeLimit;
        Topics = new List<string>(topics); // defensive copy
    }
}
