using backend.Models;
using System.Collections.Generic;

namespace backend.Services
{
    public class QuestionsService
    {
        private List<Question> _allQuestions = new()
        {
            new Question { Text = "What is 2+2?", CorrectAnswer = "4" },
            new Question { Text = "Capital of France?", CorrectAnswer = "Paris" },
            new Question { Text = "Color of the sky?", CorrectAnswer = "Blue" },
            new Question { Text = "Fastest land animal?", CorrectAnswer = "Cheetah" },
            new Question { Text = "Largest planet?", CorrectAnswer = "Jupiter" },
            new Question { Text = "Water freezes at?", CorrectAnswer = "0°C" },
            new Question { Text = "How many continents?", CorrectAnswer = "7" },
            new Question { Text = "Primary color?", CorrectAnswer = "Red" },
            new Question { Text = "Hottest planet?", CorrectAnswer = "Venus" },
            new Question { Text = "Deepest ocean?", CorrectAnswer = "Pacific" }
        };

        public List<Question> GetQuestions(int total)
        {
            return _allQuestions.Take(total).ToList();
        }
    }
}
