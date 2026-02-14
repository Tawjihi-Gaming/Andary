using backend.Models;
using System.Collections.Generic;

namespace backend.Services
{
    public class QuestionsService
    {
        // TODO: Replace with database queries once DbContext is set up.
        // These methods define the contract that the rest of the app uses.

        // Get all available topic names from the database
        public List<string> GetTopics()
        {
            // Will query the database for distinct topics
            return new List<string>();
        }

        // Get questions filtered by topic from the database
        public List<Question> GetQuestions(int total, string topic)
        {
            // Will query the database for questions matching the topic
            return new List<Question>();
        }
    }
}
