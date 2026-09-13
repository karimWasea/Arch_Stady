using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Infrastructure.Data;
using HospitalManagement.Infrastructure.Repositories.Clinical;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Tests;

public class PersistenceRepositoryTests
{
    private static ApplicationDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task PatientRepository_AddAndGetById_WorksSuccessfully()
    {
        // Arrange
        using var context = CreateInMemoryContext(nameof(PatientRepository_AddAndGetById_WorksSuccessfully));
        var repo = new PatientRepository(context);

        var patient = new Patient
        {
            FirstName = "Michael",
            LastName = "Scott",
            DateOfBirth = new DateTime(1965, 3, 15),
            Gender = "Male",
            Phone = "555-0199",
            Email = "m.scott@dunder.com",
            Address = "Scranton, PA",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var added = await repo.AddAsync(patient);
        var retrieved = await repo.GetByIdAsync(added.Id);

        // Assert
        Assert.NotNull(retrieved);
        Assert.Equal("Michael", retrieved.FirstName);
        Assert.Equal("m.scott@dunder.com", retrieved.Email);
    }

    [Fact]
    public async Task AppointmentRepository_ConflictDetection_DetectsDoctorAndPatientBusy()
    {
        // Arrange
        using var context = CreateInMemoryContext(nameof(AppointmentRepository_ConflictDetection_DetectsDoctorAndPatientBusy));
        var repo = new AppointmentRepository(context);

        var slotTime = new DateTime(2026, 10, 15, 10, 0, 0, DateTimeKind.Utc);

        var appointment = new Appointment
        {
            PatientId = 10,
            DoctorId = 20,
            AppointmentDate = slotTime,
            Status = AppointmentStatus.Scheduled,
            CreatedAt = DateTime.UtcNow
        };
        await repo.AddAsync(appointment);

        // Act
        var doctorConflict = await repo.HasDoctorConflictAsync(20, slotTime);
        var patientConflict = await repo.HasPatientConflictAsync(10, slotTime);
        var otherDoctorConflict = await repo.HasDoctorConflictAsync(99, slotTime);

        // Assert
        Assert.True(doctorConflict);
        Assert.True(patientConflict);
        Assert.False(otherDoctorConflict);
    }
}
