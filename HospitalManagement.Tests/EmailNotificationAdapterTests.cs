using HospitalManagement.Application.Interfaces.Notifications;
using HospitalManagement.Infrastructure.Notifications;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace HospitalManagement.Tests;

public class EmailServiceTests
{
    [Fact]
    public async Task EmailService_DispatchesWithoutThrowing()
    {
        // Arrange
        var configData = new Dictionary<string, string?>
        {
            { "EmailSettings:SenderEmail", "test@hospital.org" },
            { "EmailSettings:SenderName", "Test Hospital" }
        };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(configData).Build();
        var logger = NullLogger<EmailService>.Instance;
        var service = new EmailService(configuration, logger);

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

        // Act & Assert
        var exception = await Record.ExceptionAsync(() => service.SendAppointmentBookedAsync(notification));
        Assert.Null(exception);
    }
}
