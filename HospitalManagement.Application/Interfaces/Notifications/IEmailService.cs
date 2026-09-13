namespace HospitalManagement.Application.Interfaces.Notifications;

public record AppointmentNotificationDto(
    int AppointmentId,
    string PatientName,
    string PatientEmail,
    string DoctorName,
    string DoctorSpecialization,
    DateTime AppointmentDate,
    string Status,
    string? Notes = null
);

public record LabResultNotificationDto(
    int LabOrderId,
    string PatientName,
    string PatientEmail,
    string TestName,
    string ResultValue,
    bool IsAbnormal,
    DateTime PerformedDate
);

public record InvoiceNotificationDto(
    int InvoiceId,
    string InvoiceNumber,
    string PatientName,
    string PatientEmail,
    decimal TotalAmount,
    decimal BalanceDue,
    DateTime DueDate
);

public interface IEmailService
{
    Task SendAppointmentBookedAsync(AppointmentNotificationDto notification, CancellationToken cancellationToken = default);
    Task SendAppointmentCancelledAsync(AppointmentNotificationDto notification, CancellationToken cancellationToken = default);
    Task SendLabResultReadyAsync(LabResultNotificationDto notification, CancellationToken cancellationToken = default);
    Task SendInvoiceCreatedAsync(InvoiceNotificationDto notification, CancellationToken cancellationToken = default);
}
