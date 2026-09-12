using HospitalManagement.Adapters.Persistence.Context;
using HospitalManagement.Adapters.Persistence.Repositories;
using HospitalManagement.Core.Domain;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Tests;

public class PersistenceAdapterTests
{
    private static ApplicationDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task SqlPatientRepository_AddAndGetById_WorksSuccessfully()
    {
        // Arrange
        using var context = CreateInMemoryContext(nameof(SqlPatientRepository_AddAndGetById_WorksSuccessfully));
        var repo = new SqlPatientRepository(context);

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
    public async Task SqlAppointmentRepository_ConflictDetection_DetectsDoctorAndPatientBusy()
    {
        // Arrange
        using var context = CreateInMemoryContext(nameof(SqlAppointmentRepository_ConflictDetection_DetectsDoctorAndPatientBusy));
        var repo = new SqlAppointmentRepository(context);

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
