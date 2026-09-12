using HospitalManagement.Adapters.Notifications.Email;
using HospitalManagement.Core.Ports.Outbound.Notifications;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace HospitalManagement.Tests;

public class EmailNotificationAdapterTests
{
    [Fact]
    public async Task EmailNotificationAdapter_DispatchesWithoutThrowing()
    {
        // Arrange
        var settings = Options.Create(new EmailSettings
        {
            UseDevelopmentLogger = true,
            SmtpHost = "localhost"
        });
        var logger = NullLogger<EmailNotificationAdapter>.Instance;
        var adapter = new EmailNotificationAdapter(settings, logger);

        var notification = new AppointmentNotificationDto(
            AppointmentId: 99,
            PatientName: "Sarah Connor",
            PatientEmail: "sarah@cyberdyne.org",
            DoctorName: "Dr. Peter Silberman",
            DoctorSpecialization: "Psychiatry",
            AppointmentDate: DateTime.UtcNow.AddDays(3),
            Status: "Scheduled",
            Notes: "Initial consultation"
        );

        // Act & Assert (should complete successfully in development simulation mode)
        var exception = await Record.ExceptionAsync(() => adapter.SendAppointmentBookedAsync(notification));
        Assert.Null(exception);
    }
}
