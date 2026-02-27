namespace Backend.Services
{
    /// Long-running hosted service that drains the email queue and sends each message.
    public class EmailBackgroundService : BackgroundService
    {
        private readonly IEmailQueue _queue;
        private readonly EmailSender _sender;
        private readonly ILogger<EmailBackgroundService> _logger;

        public EmailBackgroundService(
            IEmailQueue queue,
            EmailSender sender,
            ILogger<EmailBackgroundService> logger)
        {
            _queue = queue;
            _sender = sender;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("EmailBackgroundService started.");

            // Loop until the host signals shutdown.
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Await the next queued message (blocks without burning CPU).
                    var email = await _queue.DequeueAsync(stoppingToken);
                    await _sender.SendAsync(email, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Graceful shutdown — break out of the loop.
                    break;
                }
                catch (Exception ex)
                {
                    // Log and continue; one failed email must not kill the worker.
                    _logger.LogError(ex, "Failed to send queued email.");
                }
            }

            _logger.LogInformation("EmailBackgroundService stopped.");
        }
    }
}
