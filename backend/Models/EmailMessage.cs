namespace Backend.Models
{
    /// Represents an email to be sent by the background worker.
    public class EmailMessage
    {
        public required string To { get; set; }
        public required string Subject { get; set; }
        public required string Body { get; set; }
        public bool IsHtml { get; set; } = false;
    }
}
