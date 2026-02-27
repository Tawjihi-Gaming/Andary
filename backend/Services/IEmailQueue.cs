using Backend.Models;

namespace Backend.Services
{
    /// Thread-safe queue for outbound email messages.
    public interface IEmailQueue
    {
        /// Enqueue an email for background delivery.
        void Enqueue(EmailMessage message);

        /// Wait for and dequeue the next email. Respects cancellation.
        Task<EmailMessage> DequeueAsync(CancellationToken cancellationToken);
    }
}
