using Backend.Models;
using Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class QuestionsService
    {
        private readonly AppDbContext _context;

        public QuestionsService(AppDbContext context)
        {
            _context = context;
        }

        // Get all available topic names from the database
        public List<string> GetTopics()
        {
            return _context.Topics
                .Select(t => t.Name)
                .ToList();
        }

        // Get questions filtered by topic from the database
        public List<Question> GetQuestions(int total, string topicName)
        {
            if (total <= 0 || string.IsNullOrWhiteSpace(topicName))
                return new List<Question>();

            var normalizedTopicName = topicName.Trim();
            var topic = _context.Topics
                .AsNoTracking()
                .ToList()
                .FirstOrDefault(t => string.Equals(t.Name, normalizedTopicName, StringComparison.OrdinalIgnoreCase));

            if (topic == null)
                return new List<Question>();

            return _context.Questions
                .AsNoTracking()
                .Where(q => q.TopicId == topic.Id)
                .OrderBy(_ => Guid.NewGuid())
                .Take(total)
                .Select(q => new Question
                {
                    Id = q.Id,
                    TopicId = q.TopicId,
                    QuestionText = q.QuestionText,
                    CorrectAnswer = q.CorrectAnswer,
                    Explanation = q.Explanation,
                    Modifier = q.Modifier,
                    CreatedAt = q.CreatedAt,
                    TopicName = topic.Name
                })
                .ToList();
        }

        // Get questions from multiple topics, distributed evenly
        public List<Question> GetQuestionsFromTopics(int total, List<string> topicNames)
        {
            if (total <= 0)
                return new List<Question>();

            var allQuestions = new List<Question>();
            var normalizedTopics = (topicNames ?? new List<string>())
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Select(t => t.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            // Match selected topics against DB names in a case-insensitive way.
            var topicsInDb = _context.Topics
                .AsNoTracking()
                .Select(t => new { t.Id, t.Name })
                .ToList();

            var matchedTopics = topicsInDb
                .Where(t => normalizedTopics.Contains(t.Name, StringComparer.OrdinalIgnoreCase))
                .ToList();

            // Distribute questions evenly across topics that actually exist.
            if (matchedTopics.Count > 0)
            {
                int perTopic = total / matchedTopics.Count;
                int remainder = total % matchedTopics.Count;

                foreach (var topic in matchedTopics)
                {
                    int count = perTopic + (remainder > 0 ? 1 : 0);
                    if (remainder > 0) remainder--;
                    if (count <= 0) continue;

                    var questions = _context.Questions
                        .AsNoTracking()
                        .Where(q => q.TopicId == topic.Id)
                        .OrderBy(_ => Guid.NewGuid())
                        .Take(count)
                        .Select(q => new Question
                        {
                            Id = q.Id,
                            TopicId = q.TopicId,
                            QuestionText = q.QuestionText,
                            CorrectAnswer = q.CorrectAnswer,
                            Explanation = q.Explanation,
                            Modifier = q.Modifier,
                            CreatedAt = q.CreatedAt,
                            TopicName = topic.Name
                        })
                        .ToList();

                    allQuestions.AddRange(questions);
                }
            }

            // If selected topics provide too few/no questions, backfill from the global pool
            // so gameplay can still proceed instead of stalling in topic selection.
            int remaining = total - allQuestions.Count;
            if (remaining > 0)
            {
                var usedIds = allQuestions.Select(q => q.Id).ToList();
                var fallbackQuery = _context.Questions
                    .AsNoTracking()
                    .Include(q => q.Topic)
                    .AsQueryable();

                if (usedIds.Count > 0)
                    fallbackQuery = fallbackQuery.Where(q => !usedIds.Contains(q.Id));

                var fallbackQuestions = fallbackQuery
                    .OrderBy(_ => Guid.NewGuid())
                    .Take(remaining)
                    .Select(q => new Question
                    {
                        Id = q.Id,
                        TopicId = q.TopicId,
                        QuestionText = q.QuestionText,
                        CorrectAnswer = q.CorrectAnswer,
                        Explanation = q.Explanation,
                        Modifier = q.Modifier,
                        CreatedAt = q.CreatedAt,
                        TopicName = q.Topic.Name
                    })
                    .ToList();

                allQuestions.AddRange(fallbackQuestions);
            }

            // Shuffle so topics are mixed
            return allQuestions.OrderBy(_ => Guid.NewGuid()).ToList();
        }
    }
}
