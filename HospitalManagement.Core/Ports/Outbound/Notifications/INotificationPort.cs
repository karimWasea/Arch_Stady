namespace HospitalManagement.Core.Ports.Outbound.Notifications;

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

/// <summary>
/// Driven (Outbound) Port for dispatching notifications (Email / SMS).
/// Core application logic emits notifications; the Email Notification Adapter implements it.
/// </summary>
public interface INotificationPort
{
    Task SendAppointmentBookedAsync(AppointmentNotificationDto notification, CancellationToken cancellationToken = default);

    Task SendAppointmentCancelledAsync(AppointmentNotificationDto notification, CancellationToken cancellationToken = default);

    Task SendAppointmentRescheduledAsync(AppointmentNotificationDto notification, DateTime oldDate, CancellationToken cancellationToken = default);
}
