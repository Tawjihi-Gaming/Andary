using System;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class Question
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public int TopicId { get; set; }
        [Required]
        public Topic Topic { get; set; } = null!;
        [Required]
        [MaxLength(500)]
        public string QuestionText { get; set; } = string.Empty;
        [Required]
        [MaxLength(500)]
        public string CorrectAnswer { get; set; } = string.Empty;
        [MaxLength(1000)]
        public string? Explanation { get; set; }
        [MaxLength(500)]
        public string? Modifier { get; set; }
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}