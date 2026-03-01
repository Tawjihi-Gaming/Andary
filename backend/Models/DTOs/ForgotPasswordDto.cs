using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs
{
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        [MaxLength(50, ErrorMessage = "Email must not exceed 50 characters")]
        public string Email { get; set; } = string.Empty;
    }
}