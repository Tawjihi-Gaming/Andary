namespace backend.Models;

public class AuthLocal
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
