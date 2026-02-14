namespace backend.Models;

public class GameRound
{
    public int RoundNumber { get; }
    public string Topic { get; }
    public string QuestionText { get; }
    public string CorrectAnswer { get; }
    public Dictionary<string, string> FakeAnswers { get; } = new();
    public Dictionary<string, string> SelectedAnswers { get; } = new();

    public GameRound(int roundNumber, string topic, string questionText, string correctAnswer)
    {
        if (roundNumber <= 0)
            throw new ArgumentException("Round number must be positive", nameof(roundNumber));
        if (string.IsNullOrWhiteSpace(topic))
            throw new ArgumentException("Topic cannot be empty", nameof(topic));
        if (string.IsNullOrWhiteSpace(questionText))
            throw new ArgumentException("Question text cannot be empty", nameof(questionText));
        if (string.IsNullOrWhiteSpace(correctAnswer))
            throw new ArgumentException("Correct answer cannot be empty", nameof(correctAnswer));

        RoundNumber = roundNumber;
        Topic = topic;
        QuestionText = questionText;
        CorrectAnswer = correctAnswer;
    }

    public void SubmitFakeAnswer(string playerId, string fakeAnswer)
    {
        if (string.IsNullOrWhiteSpace(fakeAnswer))
            throw new ArgumentException("Fake answer cannot be empty", nameof(fakeAnswer));

        FakeAnswers[playerId] = fakeAnswer;
    }

    public void SubmitSelectedAnswer(string playerId, string selectedAnswer)
    {
        if (string.IsNullOrWhiteSpace(selectedAnswer))
            throw new ArgumentException("Selected answer cannot be empty", nameof(selectedAnswer));

        SelectedAnswers[playerId] = selectedAnswer;
    }

    public List<string> GetAllAnswers()
    {
        var answers = new List<string>(FakeAnswers.Values) { CorrectAnswer };
        return answers;
    }

    public Dictionary<string, int> CalculateRoundScores()
    {
        var scores = new Dictionary<string, int>();

        foreach (var (playerId, selectedAnswer) in SelectedAnswers)
        {
            // Points for selecting correct answer
            if (selectedAnswer == CorrectAnswer)
            {
                scores[playerId] = scores.GetValueOrDefault(playerId) + 10;
            }
        }

        // Points for players whose fake answer was selected by others
        foreach (var (playerId, selectedAnswer) in SelectedAnswers)
        {
            foreach (var (authorId, fakeAnswer) in FakeAnswers)
            {
                if (selectedAnswer == fakeAnswer && playerId != authorId)
                {
                    scores[authorId] = scores.GetValueOrDefault(authorId) + 5;
                }
            }
        }

        return scores;
    }

    public bool AllFakeAnswersSubmitted(int expectedPlayerCount)
    {
        return FakeAnswers.Count >= expectedPlayerCount;
    }

    public bool AllAnswersSelected(int expectedPlayerCount)
    {
        return SelectedAnswers.Count >= expectedPlayerCount;
    }
}
