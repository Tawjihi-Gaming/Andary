using backend.Models;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
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
                .ToList();
        }
    }
}
