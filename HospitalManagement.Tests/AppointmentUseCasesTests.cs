using HospitalManagement.Application.DTOs.Clinical;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Notifications;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Application.Services.Clinical;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;
using Moq;

namespace HospitalManagement.Tests;

public class AppointmentServiceTests
{
    private readonly Mock<IAppointmentRepository> _appointmentRepoMock = new();
    private readonly Mock<IPatientRepository> _patientRepoMock = new();
    private readonly Mock<IDoctorRepository> _doctorRepoMock = new();
    private readonly Mock<ICacheService> _cacheServiceMock = new();
    private readonly Mock<IEmailService> _emailServiceMock = new();

    private readonly AppointmentService _service;

    public AppointmentServiceTests()
    {
        _service = new AppointmentService(
            _appointmentRepoMock.Object,
            _patientRepoMock.Object,
            _doctorRepoMock.Object,
            _cacheServiceMock.Object,
            _emailServiceMock.Object);
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
            .ReturnsAsync(Patient.Create("John", "Doe", new DateTime(1990, 1, 1), "Male", "123", "john@example.com", "Addr").SetId(1));

        _doctorRepoMock.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Doctor.Create("Sarah", "Smith", "Cardiologist", "123", "sarah@hospital.org", 1).SetId(2));

        _appointmentRepoMock.Setup(r => r.HasDoctorConflictAsync(2, appointmentDate, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(dto));
        Assert.Contains("Doctor is already booked", ex.Message);

        _appointmentRepoMock.Verify(r => r.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()), Times.Never);
        _emailServiceMock.Verify(n => n.SendAppointmentBookedAsync(It.IsAny<AppointmentNotificationDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WhenValid_SavesAppointmentAndSendsEmailNotification()
    {
        // Arrange
        var appointmentDate = DateTime.UtcNow.AddDays(2);
        var dto = new CreateAppointmentDto
        {
            PatientId = 1,
            DoctorId = 2,
            AppointmentDate = appointmentDate,
            Notes = "Checkup"
        };

        var patient = Patient.Create("John", "Doe", new DateTime(1990, 1, 1), "Male", "123", "john@example.com", "Addr").SetId(1);
        var doctor = Doctor.Create("Sarah", "Smith", "Cardiologist", "123", "sarah@hospital.org", 1).SetId(2);

        _patientRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(patient);
        _doctorRepoMock.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(doctor);
        _appointmentRepoMock.Setup(r => r.HasDoctorConflictAsync(2, appointmentDate, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _appointmentRepoMock.Setup(r => r.HasPatientConflictAsync(1, appointmentDate, null, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        _appointmentRepoMock.Setup(r => r.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Appointment a, CancellationToken _) =>
            {
                a.SetId(10);
                a.Patient = patient;
                a.Doctor = doctor;
                return a;
            });

        // Act
        var result = await _service.CreateAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(10, result.Id);
        Assert.Equal(AppointmentStatus.Scheduled, result.Status);

        _appointmentRepoMock.Verify(r => r.AddAsync(It.IsAny<Appointment>(), It.IsAny<CancellationToken>()), Times.Once);
        _cacheServiceMock.Verify(c => c.RemoveByPrefixAsync("appointments:", It.IsAny<CancellationToken>()), Times.Once);
        _emailServiceMock.Verify(n => n.SendAppointmentBookedAsync(It.Is<AppointmentNotificationDto>(dto =>
            dto.AppointmentId == 10 &&
            dto.PatientEmail == "john@example.com" &&
            dto.DoctorName == "Dr. Sarah Smith"
        ), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CancelAsync_WhenValid_UpdatesStatusAndSendsCancellationEmail()
    {
        // Arrange
        var patient = Patient.Create("John", "Doe", new DateTime(1990, 1, 1), "Male", "123", "john@example.com", "Addr").SetId(1);
        var doctor = Doctor.Create("Sarah", "Smith", "Cardiologist", "123", "sarah@hospital.org", 1).SetId(2);
        var appointment = Appointment.Create(1, 2, DateTime.UtcNow.AddDays(1), "Routine").SetId(5);
        appointment.Patient = patient;
        appointment.Doctor = doctor;

        _appointmentRepoMock.Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(appointment);

        // Act
        var result = await _service.CancelAsync(5);

        // Assert
        Assert.Equal(AppointmentStatus.Cancelled, result.Status);
        _appointmentRepoMock.Verify(r => r.UpdateAsync(It.Is<Appointment>(a => a.Status == AppointmentStatus.Cancelled), It.IsAny<CancellationToken>()), Times.Once);
        _emailServiceMock.Verify(n => n.SendAppointmentCancelledAsync(It.Is<AppointmentNotificationDto>(dto =>
            dto.AppointmentId == 5 &&
            dto.PatientEmail == "john@example.com"
        ), It.IsAny<CancellationToken>()), Times.Once);
    }
}
