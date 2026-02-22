using Backend.Models;
using Backend.Models.DTOs;
using System.Text.Json;

namespace Backend.Data
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(AppDbContext context)
        {
            // Check if already seeded
            if (context.Topics.Any())
                return;

            var seedDataPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "SeedData");
            
            if (!Directory.Exists(seedDataPath))
                return;

            var jsonFiles = Directory.GetFiles(seedDataPath, "*.json");
            
            if (jsonFiles.Length == 0)
                return;

            foreach (var jsonFile in jsonFiles)
            {
                var fileName = Path.GetFileNameWithoutExtension(jsonFile);
                
                // Create topic
                var topic = new Topic 
                { 
                    Name = fileName,
                    CreatedAt = DateTime.UtcNow
                };
                
                context.Topics.Add(topic);
                await context.SaveChangesAsync(); // Save to get the auto-generated ID

                // Read questions
                var jsonContent = await File.ReadAllTextAsync(jsonFile);
                var questionDtos = JsonSerializer.Deserialize<List<QuestionSeedDto>>(jsonContent);

                if (questionDtos != null)
                {
                    foreach (var dto in questionDtos)
                    {
                        var question = new Question
                        {
                            TopicId = topic.Id,
                            QuestionText = dto.question,
                            CorrectAnswer = dto.answer,
                            Explanation = dto.explanation,
                            Modifier = dto.modifier,
                            CreatedAt = DateTime.UtcNow
                        };
                        
                        context.Questions.Add(question);
                    }
                }
                
                await context.SaveChangesAsync();
            }
        }
    }
}