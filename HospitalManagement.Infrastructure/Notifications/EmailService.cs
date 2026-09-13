using HospitalManagement.Application.Interfaces.Notifications;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HospitalManagement.Infrastructure.Notifications;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly string _fromEmail;
    private readonly string _fromName;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _logger = logger;
        _fromEmail = configuration["EmailSettings:SenderEmail"] ?? "notifications@hospital.org";
        _fromName = configuration["EmailSettings:SenderName"] ?? "CarePoint Hospital System";
    }

    public async Task SendAppointmentBookedAsync(AppointmentNotificationDto notification, CancellationToken cancellationToken = default)
    {
        var subject = $"Appointment Confirmation #{notification.AppointmentId} - CarePoint Hospital";
        var body = $"Dear {notification.PatientName}, your appointment with {notification.DoctorName} ({notification.DoctorSpecialization}) is scheduled for {notification.AppointmentDate:f}.";

        _logger.LogInformation("[EmailService] To: {Email} | Subject: {Subject}", notification.PatientEmail, subject);
        _logger.LogInformation("[EmailService] Content: {Body}", body);

        await Task.CompletedTask;
    }

    public async Task SendAppointmentCancelledAsync(AppointmentNotificationDto notification, CancellationToken cancellationToken = default)
    {
        var subject = $"Appointment Cancellation #{notification.AppointmentId} - CarePoint Hospital";
        var body = $"Dear {notification.PatientName}, your appointment with {notification.DoctorName} on {notification.AppointmentDate:f} has been cancelled.";

        _logger.LogInformation("[EmailService] To: {Email} | Subject: {Subject}", notification.PatientEmail, subject);
        _logger.LogInformation("[EmailService] Content: {Body}", body);

        await Task.CompletedTask;
    }

    public async Task SendLabResultReadyAsync(LabResultNotificationDto notification, CancellationToken cancellationToken = default)
    {
        var flag = notification.IsAbnormal ? "[ABNORMAL ATTENTION REQUIRED]" : "[Normal]";
        var subject = $"{flag} Lab Result Ready for Order #{notification.LabOrderId} - {notification.TestName}";
        var body = $"Dear {notification.PatientName}, your lab test '{notification.TestName}' has been analyzed. Value: {notification.ResultValue}. Abnormal: {notification.IsAbnormal}.";

        _logger.LogInformation("[EmailService] To: {Email} | Subject: {Subject}", notification.PatientEmail, subject);
        _logger.LogInformation("[EmailService] Content: {Body}", body);

        await Task.CompletedTask;
    }

    public async Task SendInvoiceCreatedAsync(InvoiceNotificationDto notification, CancellationToken cancellationToken = default)
    {
        var subject = $"Invoice Generated #{notification.InvoiceNumber} - CarePoint Hospital";
        var body = $"Dear {notification.PatientName}, an invoice #{notification.InvoiceNumber} for amount ${notification.TotalAmount:F2} (Balance Due: ${notification.BalanceDue:F2}) has been issued. Due Date: {notification.DueDate:d}.";

        _logger.LogInformation("[EmailService] To: {Email} | Subject: {Subject}", notification.PatientEmail, subject);
        _logger.LogInformation("[EmailService] Content: {Body}", body);

        await Task.CompletedTask;
    }
}
