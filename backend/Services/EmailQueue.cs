using System.Threading.Channels;
using Backend.Models;

namespace Backend.Services
{
    /// In-memory, thread-safe email queue backed by an unbounded Channel.
    public class EmailQueue : IEmailQueue
    {
        // Unbounded channel: writers never block; the background worker reads at its own pace.
        private readonly Channel<EmailMessage> _channel =
            Channel.CreateUnbounded<EmailMessage>(new UnboundedChannelOptions
            {
                SingleReader = true
            });

        public void Enqueue(EmailMessage message)
        {
            if (!_channel.Writer.TryWrite(message))
                throw new InvalidOperationException("Failed to enqueue email message.");
        }

        public async Task<EmailMessage> DequeueAsync(CancellationToken cancellationToken)
        {
            return await _channel.Reader.ReadAsync(cancellationToken);
        }
    }
}
