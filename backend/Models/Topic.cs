using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace Backend.Models
{
    public class Topic
    {
        [Key]
        public int Id { get; set; }
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<Question> Questions { get; set; } = new List<Question>();
    }
}