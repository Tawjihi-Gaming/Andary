namespace Backend.Models.DTOs
{
    public class QuestionSeedDto
    {
        public string question { get; set; } = string.Empty;
        public string answer { get; set; } = string.Empty;
        public string? explanation { get; set; }
        public string? modifier { get; set; }
    }
}
