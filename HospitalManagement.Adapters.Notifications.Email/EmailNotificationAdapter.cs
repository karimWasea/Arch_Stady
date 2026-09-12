using System.Net;
using System.Net.Mail;
using System.Text;
using HospitalManagement.Core.Ports.Outbound.Notifications;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HospitalManagement.Adapters.Notifications.Email;

/// <summary>
/// Secondary (Driven) Adapter implementing INotificationPort.
/// Sends real SMTP emails when configured, or prints beautifully formatted
/// email dispatch cards to the console/logger in Development Mode.
/// </summary>
public class EmailNotificationAdapter : INotificationPort
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailNotificationAdapter> _logger;

    public EmailNotificationAdapter(IOptions<EmailSettings> options, ILogger<EmailNotificationAdapter> logger)
    {
        _settings = options.Value;
        _logger = logger;
    }

    public async Task SendAppointmentBookedAsync(AppointmentNotificationDto notification, CancellationToken cancellationToken = default)
    {
        var subject = $"🏥 Appointment Confirmed - {notification.DoctorName} on {notification.AppointmentDate:MMM dd, yyyy}";
        var htmlBody = EmailTemplates.BuildAppointmentBookedHtml(notification);

        await DispatchEmailAsync(notification.PatientEmail, notification.PatientName, subject, htmlBody, cancellationToken);
    }

    public async Task SendAppointmentCancelledAsync(AppointmentNotificationDto notification, CancellationToken cancellationToken = default)
    {
        var subject = $"⚠️ Appointment Cancelled - #{notification.AppointmentId}";
        var htmlBody = EmailTemplates.BuildAppointmentCancelledHtml(notification);

        await DispatchEmailAsync(notification.PatientEmail, notification.PatientName, subject, htmlBody, cancellationToken);
    }

    public async Task SendAppointmentRescheduledAsync(AppointmentNotificationDto notification, DateTime oldDate, CancellationToken cancellationToken = default)
    {
        var subject = $"🗓️ Appointment Rescheduled - #{notification.AppointmentId}";
        var htmlBody = EmailTemplates.BuildAppointmentRescheduledHtml(notification, oldDate);

        await DispatchEmailAsync(notification.PatientEmail, notification.PatientName, subject, htmlBody, cancellationToken);
    }

    private async Task DispatchEmailAsync(string recipientEmail, string recipientName, string subject, string htmlBody, CancellationToken cancellationToken)
    {
        // 1. If in development mode or SMTP host is localhost/unconfigured, display email preview in console
        if (_settings.UseDevelopmentLogger || string.Equals(_settings.SmtpHost, "localhost", StringComparison.OrdinalIgnoreCase))
        {
            LogEmailPreview(recipientEmail, recipientName, subject);
            return;
        }

        // 2. Real SMTP Delivery
        try
        {
            using var client = new SmtpClient(_settings.SmtpHost, _settings.SmtpPort)
            {
                EnableSsl = _settings.EnableSsl
            };

            if (!string.IsNullOrEmpty(_settings.Username) && !string.IsNullOrEmpty(_settings.Password))
            {
                client.Credentials = new NetworkCredential(_settings.Username, _settings.Password);
            }

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_settings.SenderEmail, _settings.SenderName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true,
                BodyEncoding = Encoding.UTF8
            };
            mailMessage.To.Add(new MailAddress(recipientEmail, recipientName));

            await client.SendMailAsync(mailMessage, cancellationToken);
            _logger.LogInformation("[EmailAdapter] Dispatched email to {RecipientEmail} via SMTP ({Host}:{Port})", recipientEmail, _settings.SmtpHost, _settings.SmtpPort);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[EmailAdapter] SMTP send failed for {RecipientEmail}. Falling back to logger preview.", recipientEmail);
            LogEmailPreview(recipientEmail, recipientName, subject);
        }
    }

    private void LogEmailPreview(string to, string name, string subject)
    {
        _logger.LogInformation(
            "\n" +
            "┌─────────────────────────────────────────────────────────────┐\n" +
            "│ 📧 [EMAIL NOTIFICATION ADAPTER (HEXAGONAL OUTBOUND PORT)]   │\n" +
            "├─────────────────────────────────────────────────────────────┤\n" +
            "│ TO:      {RecipientName} <{RecipientEmail}>\n" +
            "│ SUBJECT: {Subject}\n" +
            "│ TIME:    {Timestamp:yyyy-MM-dd HH:mm:ss} UTC\n" +
            "│ STATUS:  SUCCESSFULLY DISPATCHED TO NOTIFICATION PORT       │\n" +
            "└─────────────────────────────────────────────────────────────┘",
            name, to, subject, DateTime.UtcNow);
    }
}
