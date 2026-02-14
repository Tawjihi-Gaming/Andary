namespace backend.Models;

public class AuthOAuth
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public string Provider { get; set; } = "";
    public string ProviderUserId { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
