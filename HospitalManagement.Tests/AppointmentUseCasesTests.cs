using HospitalManagement.Core.Domain;
using HospitalManagement.Core.DTOs.Appointment;
using HospitalManagement.Core.Exceptions;
using HospitalManagement.Core.Ports.Outbound.Caching;
using HospitalManagement.Core.Ports.Outbound.Notifications;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using HospitalManagement.Core.UseCases;
using Moq;

namespace HospitalManagement.Tests;

public class AppointmentUseCasesTests
{
    private readonly Mock<IAppointmentRepository> _appointmentRepoMock = new();
    private readonly Mock<IPatientRepository> _patientRepoMock = new();
    private readonly Mock<IDoctorRepository> _doctorRepoMock = new();
    private readonly Mock<ICachePort> _cachePortMock = new();
    private readonly Mock<INotificationPort> _notificationPortMock = new();

    private readonly AppointmentUseCases _useCases;

    public AppointmentUseCasesTests()
    {
        _useCases = new AppointmentUseCases(
            _appointmentRepoMock.Object,
            _patientRepoMock.Object,
            _doctorRepoMock.Object,
            _cachePortMock.Object,
            _notificationPortMock.Object);
    }

    [Fact]
    public async Task CreateAsync_WhenDoctorHasConflict_ThrowsConflictException()
    {
        // Arrange
        var appointmentDate = DateTime.UtcNow.AddDays(1);
        var dto = new CreateAppointmentDto
        {
            PatientId = 1,
            DoctorId = 2,
            AppointmentDate = appointmentDate
        };

        _patientRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Patient { Id = 1, FirstName = "John", LastName = "Doe" });

        _doctorRepoMock.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Doctor { Id = 2, FirstName = "Sarah", LastName = "Smith" });

        // Simulate doctor conflict
        _appointmentRepoMock.Setup(r => r.HasDoctorConflictAsync(2, appointmentDate, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => _useCases.CreateAsync(dto));
        Assert.Contains("Doctor is already booked", ex.Message);

        // Ensure no appointment was persisted and no email was sent
        _appointmentRepoMock.Verify(r => r.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()), Times.Never);
        _notificationPortMock.Verify(n => n.SendAppointmentBookedAsync(It.IsAny<AppointmentNotificationDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WhenValid_PersistsEvictsCacheAndSendsEmailNotification()
    {
        // Arrange
        var appointmentDate = DateTime.UtcNow.AddDays(2);
        var dto = new CreateAppointmentDto
        {
            PatientId = 1,
            DoctorId = 2,
            AppointmentDate = appointmentDate,
            Notes = "Routine checkup"
        };

        var patient = new Patient { Id = 1, FirstName = "Alice", LastName = "Smith", Email = "alice@example.com" };
        var doctor = new Doctor { Id = 2, FirstName = "Robert", LastName = "Taylor", Specialization = "Cardiology" };

        _patientRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(patient);
        _doctorRepoMock.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(doctor);
        _appointmentRepoMock.Setup(r => r.HasDoctorConflictAsync(2, appointmentDate, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _appointmentRepoMock.Setup(r => r.HasPatientConflictAsync(1, appointmentDate, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        _appointmentRepoMock.Setup(r => r.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Appointment a, CancellationToken _) =>
            {
                a.Id = 100;
                return a;
            });

        // Act
        var result = await _useCases.CreateAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(100, result.Id);
        Assert.Equal(AppointmentStatus.Scheduled, result.Status);

        // 1. Verify Persistence Port was called
        _appointmentRepoMock.Verify(r => r.AddAsync(It.Is<Appointment>(a => a.PatientId == 1 && a.DoctorId == 2), It.IsAny<CancellationToken>()), Times.Once);

        // 2. Verify Redis Cache Port was cleared
        _cachePortMock.Verify(c => c.RemoveByPrefixAsync("appointments:", It.IsAny<CancellationToken>()), Times.Once);

        // 3. Verify Email Notification Port was dispatched
        _notificationPortMock.Verify(n => n.SendAppointmentBookedAsync(
            It.Is<AppointmentNotificationDto>(e => e.AppointmentId == 100 && e.PatientEmail == "alice@example.com" && e.DoctorName == "Dr. Robert Taylor"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CancelAsync_WhenValid_UpdatesStatusEvictsCacheAndSendsCancellationEmail()
    {
        // Arrange
        var appointment = new Appointment
        {
            Id = 42,
            PatientId = 1,
            DoctorId = 2,
            AppointmentDate = DateTime.UtcNow.AddDays(1),
            Status = AppointmentStatus.Scheduled,
            Patient = new Patient { Id = 1, FirstName = "John", LastName = "Doe", Email = "john@example.com" },
            Doctor = new Doctor { Id = 2, FirstName = "Emily", LastName = "Clark", Specialization = "Neurology" }
        };

        _appointmentRepoMock.Setup(r => r.GetByIdAsync(42, It.IsAny<CancellationToken>())).ReturnsAsync(appointment);

        // Act
        var result = await _useCases.CancelAsync(42);

        // Assert
        Assert.Equal(AppointmentStatus.Cancelled, result.Status);
        _appointmentRepoMock.Verify(r => r.UpdateAsync(It.Is<Appointment>(a => a.Status == AppointmentStatus.Cancelled), It.IsAny<CancellationToken>()), Times.Once);
        _cachePortMock.Verify(c => c.RemoveByPrefixAsync("appointments:", It.IsAny<CancellationToken>()), Times.Once);
        _notificationPortMock.Verify(n => n.SendAppointmentCancelledAsync(
            It.Is<AppointmentNotificationDto>(e => e.AppointmentId == 42 && e.PatientEmail == "john@example.com"),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
