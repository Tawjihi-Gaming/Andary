using System.ComponentModel.DataAnnotations;

public class ResetPasswordDto
{
    [Required(ErrorMessage = "Token is required")]
    public string Token { get; set; } = string.Empty;

    [Required(ErrorMessage = "New password is required")]
    [MinLength(6, ErrorMessage = "Password must be at least 6 characters long")]
    [MaxLength(100, ErrorMessage = "Password cannot exceed 100 characters")]
    public string NewPassword { get; set; } = string.Empty;
}