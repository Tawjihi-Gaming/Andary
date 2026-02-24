using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs
{
    public class PlayerEditDto
    {
        [MaxLength(50, ErrorMessage = "Username must not exceed 50 characters")]
        public string? Username { get; set; }

        [EmailAddress(ErrorMessage = "Invalid email format")]

        public string? Email { get; set; }

        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string? Password { get; set; }

        [MaxLength(100, ErrorMessage = "Avatar image name must not exceed 100 characters")]
        public string? AvatarImageName { get; set; }
    }
}
