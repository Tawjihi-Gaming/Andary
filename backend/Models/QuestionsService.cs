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
            var topic = _context.Topics.FirstOrDefault(t => t.Name == topicName);
            if (topic == null)
                return new List<Question>();

            return _context.Questions
                .Where(q => q.TopicId == topic.Id)
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
                    TopicName = topicName
                })
                .ToList();
        }

        // Get questions from multiple topics, distributed evenly
        public List<Question> GetQuestionsFromTopics(int total, List<string> topicNames)
        {
            var allQuestions = new List<Question>();
            // Distribute questions evenly across topics
            int perTopic = total / topicNames.Count;
            int remainder = total % topicNames.Count;

            foreach (var topicName in topicNames)
            {
                int count = perTopic + (remainder > 0 ? 1 : 0);
                if (remainder > 0) remainder--;

                var questions = GetQuestions(count, topicName);
                allQuestions.AddRange(questions);
            }

            // Shuffle so topics are mixed
            return allQuestions.OrderBy(_ => Guid.NewGuid()).ToList();
        }
    }
}
