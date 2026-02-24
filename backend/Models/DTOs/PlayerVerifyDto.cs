using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs
{
    public class PlayerVerifyDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [RegularExpression(@"^\d{6}$")]
        public string Code { get; set; } = string.Empty;
    }
}
