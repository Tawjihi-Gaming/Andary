using Backend.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Backend.Services
{
    /// Wraps MailKit SMTP logic. Reads configuration from environment variables.
    public class EmailSender
    {
        private readonly ILogger<EmailSender> _logger;

        public EmailSender(ILogger<EmailSender> logger)
        {
            _logger = logger;
        }

        /// Send a single email via SMTP
        public async Task SendAsync(EmailMessage email, CancellationToken cancellationToken = default)
        {
            var smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST")
                ?? throw new InvalidOperationException("SMTP_HOST env var is missing");

            var smtpPortRaw = Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587";
            if (!int.TryParse(smtpPortRaw, out var smtpPort))
                throw new InvalidOperationException($"SMTP_PORT is not a valid integer: {smtpPortRaw}");

            var smtpUser = Environment.GetEnvironmentVariable("SMTP_USER")
                ?? throw new InvalidOperationException("SMTP_USER env var is missing");

            var smtpPass = Environment.GetEnvironmentVariable("SMTP_PASS")
                ?? throw new InvalidOperationException("SMTP_PASS env var is missing");

            var fromEmail = Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL") ?? smtpUser;
            var fromName = Environment.GetEnvironmentVariable("SMTP_FROM_NAME") ?? "Andary";

            // Build MIME message
            var mime = new MimeMessage();
            mime.From.Add(new MailboxAddress(fromName, fromEmail));
            mime.To.Add(MailboxAddress.Parse(email.To));
            mime.Subject = email.Subject;
            mime.Body = new TextPart(email.IsHtml ? "html" : "plain")
            {
                Text = email.Body
            };

            // Send via MailKit
            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls, cancellationToken);
            await client.AuthenticateAsync(smtpUser, smtpPass, cancellationToken);
            await client.SendAsync(mime, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            _logger.LogInformation("Email sent to {To} — Subject: {Subject}", email.To, email.Subject);
        }
    }
}
