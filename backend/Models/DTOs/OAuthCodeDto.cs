using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs
{
    public class OAuthCodeDto
    {
        [Required]
        public string Code { get; set; } = string.Empty;
    }
}
