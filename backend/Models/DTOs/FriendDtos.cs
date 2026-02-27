using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs
{
    public class SendFriendRequestDto
    {
        [Required]
        public int ReceiverId { get; set; }
    }

    public class PlayerBasicDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string AvatarImageName { get; set; } = string.Empty;
    }

    public class FriendRequestDto
    {
        public int Id { get; set; }
        public PlayerBasicDto Sender { get; set; } = null!;
        public PlayerBasicDto Receiver { get; set; } = null!;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class FriendDto
    {
        public int FriendshipId { get; set; }
        public PlayerBasicDto Player { get; set; } = null!;
        public DateTime Since { get; set; }
    }
}
