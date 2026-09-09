using HospitalManagement.Business.DTOs.Appointment;
using HospitalManagement.Business.DTOs.Department;
using HospitalManagement.Business.DTOs.Doctor;
using HospitalManagement.Business.DTOs.MedicalRecord;
using HospitalManagement.Business.DTOs.Patient;
using HospitalManagement.Business.DTOs.Prescription;
using HospitalManagement.Business.Exceptions;
using HospitalManagement.Business.Services;
using HospitalManagement.DataAccess.Context;
using HospitalManagement.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HospitalManagement.Tests;

public class BusinessServicesTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    // 1. Create Patient
    [Fact]
    public async Task CreatePatient_ShouldPersistAndReturnPatientDto()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new PatientService(context);
        var dto = new CreatePatientDto
        {
            FirstName = "Alice",
            LastName = "Green",
            DateOfBirth = new DateTime(1995, 5, 20, 0, 0, 0, DateTimeKind.Utc),
            Gender = "Female",
            Phone = "123-456-7890",
            Email = "alice@example.com",
            Address = "100 Maple St"
        };

        // Act
        var result = await service.CreateAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal("Alice", result.FirstName);
        Assert.Equal("Green", result.LastName);
    }

    // 2. Create Doctor
    [Fact]
    public async Task CreateDoctor_WithValidDepartment_ShouldPersistDoctor()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var dept = new Department { Name = "Cardiology", Description = "Heart care" };
        context.Departments.Add(dept);
        await context.SaveChangesAsync();

        var service = new DoctorService(context);
        var dto = new CreateDoctorDto
        {
            FirstName = "Gregory",
            LastName = "House",
            Specialization = "Diagnostic Medicine",
            DepartmentId = dept.Id,
            Phone = "555-0199",
            Email = "house@hospital.org"
        };

        // Act
        var result = await service.CreateAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal("Gregory", result.FirstName);
        Assert.Equal(dept.Id, result.DepartmentId);
    }

    // 3. Doctor must belong to department
    [Fact]
    public async Task CreateDoctor_WithNonExistentDepartment_ShouldThrowNotFoundException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new DoctorService(context);
        var dto = new CreateDoctorDto
        {
            FirstName = "John",
            LastName = "Watson",
            Specialization = "General",
            DepartmentId = 99999, // Non-existent
            Phone = "555-0198",
            Email = "watson@hospital.org"
        };

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => service.CreateAsync(dto));
    }

    // 4. Prevent duplicate doctor appointment
    [Fact]
    public async Task CreateAppointment_WhenDoctorAlreadyBookedAtSameTime_ShouldThrowConflictException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patient1 = new Patient { FirstName = "P1", LastName = "L1" };
        var patient2 = new Patient { FirstName = "P2", LastName = "L2" };
        var doctor = new Doctor { FirstName = "Doc", LastName = "Smith", Specialization = "Cardio", DepartmentId = 1 };

        context.Patients.AddRange(patient1, patient2);
        context.Doctors.Add(doctor);
        await context.SaveChangesAsync();

        var appointmentDate = new DateTime(2026, 10, 1, 10, 0, 0, DateTimeKind.Utc);
        context.Appointments.Add(new Appointment
        {
            PatientId = patient1.Id,
            DoctorId = doctor.Id,
            AppointmentDate = appointmentDate,
            Status = AppointmentStatus.Scheduled
        });
        await context.SaveChangesAsync();

        var service = new AppointmentService(context);
        var conflictDto = new CreateAppointmentDto
        {
            PatientId = patient2.Id,
            DoctorId = doctor.Id,
            AppointmentDate = appointmentDate,
            Notes = "Conflicting slot"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(conflictDto));
        Assert.Contains("Doctor is already booked", ex.Message);
    }

    // 5. Prevent duplicate patient appointment
    [Fact]
    public async Task CreateAppointment_WhenPatientAlreadyBookedAtSameTime_ShouldThrowConflictException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patient = new Patient { FirstName = "P1", LastName = "L1" };
        var doctor1 = new Doctor { FirstName = "Doc1", LastName = "A", Specialization = "Cardio", DepartmentId = 1 };
        var doctor2 = new Doctor { FirstName = "Doc2", LastName = "B", Specialization = "Neuro", DepartmentId = 1 };

        context.Patients.Add(patient);
        context.Doctors.AddRange(doctor1, doctor2);
        await context.SaveChangesAsync();

        var appointmentDate = new DateTime(2026, 10, 1, 14, 0, 0, DateTimeKind.Utc);
        context.Appointments.Add(new Appointment
        {
            PatientId = patient.Id,
            DoctorId = doctor1.Id,
            AppointmentDate = appointmentDate,
            Status = AppointmentStatus.Scheduled
        });
        await context.SaveChangesAsync();

        var service = new AppointmentService(context);
        var conflictDto = new CreateAppointmentDto
        {
            PatientId = patient.Id,
            DoctorId = doctor2.Id,
            AppointmentDate = appointmentDate,
            Notes = "Patient in two places at once"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(conflictDto));
        Assert.Contains("Patient already has an active appointment", ex.Message);
    }

    // 6. Cancel appointment
    [Fact]
    public async Task CancelAppointment_ShouldUpdateStatusToCancelled()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patient = new Patient { FirstName = "Pat", LastName = "One" };
        var doctor = new Doctor { FirstName = "Doc", LastName = "One", Specialization = "Gen", DepartmentId = 1 };
        context.Patients.Add(patient);
        context.Doctors.Add(doctor);
        await context.SaveChangesAsync();

        var appointment = new Appointment
        {
            PatientId = patient.Id,
            DoctorId = doctor.Id,
            AppointmentDate = DateTime.UtcNow.AddDays(1),
            Status = AppointmentStatus.Scheduled
        };
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();

        var service = new AppointmentService(context);

        // Act
        var result = await service.CancelAsync(appointment.Id);

        // Assert
        Assert.Equal(AppointmentStatus.Cancelled, result.Status);
        var persisted = await context.Appointments.FindAsync(appointment.Id);
        Assert.Equal(AppointmentStatus.Cancelled, persisted!.Status);
    }

    // 7. Complete appointment (scheduled can be completed, cancelled cannot)
    [Fact]
    public async Task CompleteAppointment_WhenScheduled_ShouldSucceed()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patient = new Patient { FirstName = "Pat", LastName = "One" };
        var doctor = new Doctor { FirstName = "Doc", LastName = "One", Specialization = "Gen", DepartmentId = 1 };
        context.Patients.Add(patient);
        context.Doctors.Add(doctor);
        await context.SaveChangesAsync();

        var appointment = new Appointment
        {
            PatientId = patient.Id,
            DoctorId = doctor.Id,
            AppointmentDate = DateTime.UtcNow.AddHours(-1),
            Status = AppointmentStatus.Scheduled
        };
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();

        var service = new AppointmentService(context);

        // Act
        var result = await service.CompleteAsync(appointment.Id);

        // Assert
        Assert.Equal(AppointmentStatus.Completed, result.Status);
    }

    [Fact]
    public async Task CompleteAppointment_WhenCancelled_ShouldThrowBusinessRuleException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patient = new Patient { FirstName = "Pat", LastName = "One" };
        var doctor = new Doctor { FirstName = "Doc", LastName = "One", Specialization = "Gen", DepartmentId = 1 };
        context.Patients.Add(patient);
        context.Doctors.Add(doctor);
        await context.SaveChangesAsync();

        var appointment = new Appointment
        {
            PatientId = patient.Id,
            DoctorId = doctor.Id,
            AppointmentDate = DateTime.UtcNow.AddHours(-1),
            Status = AppointmentStatus.Cancelled
        };
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();

        var service = new AppointmentService(context);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() => service.CompleteAsync(appointment.Id));
        Assert.Contains("Cancelled appointments cannot be marked as completed", ex.Message);
    }

    // 8. Create medical record (verifies Patient, Doctor, Appointment exist)
    [Fact]
    public async Task CreateMedicalRecord_WithValidPatientDoctorAppointment_ShouldSucceed()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patient = new Patient { FirstName = "Pat", LastName = "Lee" };
        var doctor = new Doctor { FirstName = "Doc", LastName = "Ray", Specialization = "Pediatrics", DepartmentId = 1 };
        context.Patients.Add(patient);
        context.Doctors.Add(doctor);
        await context.SaveChangesAsync();

        var appointment = new Appointment
        {
            PatientId = patient.Id,
            DoctorId = doctor.Id,
            AppointmentDate = DateTime.UtcNow,
            Status = AppointmentStatus.Completed
        };
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();

        var service = new MedicalRecordService(context);
        var dto = new CreateMedicalRecordDto
        {
            PatientId = patient.Id,
            DoctorId = doctor.Id,
            AppointmentId = appointment.Id,
            Diagnosis = "Acute Bronchitis",
            Symptoms = "Cough, mild fever",
            Treatment = "Rest, hydration, inhaler"
        };

        // Act
        var result = await service.CreateAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal("Acute Bronchitis", result.Diagnosis);
    }

    [Fact]
    public async Task CreateMedicalRecord_WithNonExistentPatient_ShouldThrowNotFoundException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var doctor = new Doctor { FirstName = "Doc", LastName = "Ray", Specialization = "Pediatrics", DepartmentId = 1 };
        context.Doctors.Add(doctor);
        await context.SaveChangesAsync();

        var service = new MedicalRecordService(context);
        var dto = new CreateMedicalRecordDto
        {
            PatientId = 9999, // Does not exist
            DoctorId = doctor.Id,
            Diagnosis = "Flu",
            Symptoms = "Fever",
            Treatment = "Rest"
        };

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => service.CreateAsync(dto));
    }

    // 9. Prescription requires at least one item
    [Fact]
    public async Task CreatePrescription_WithZeroItems_ShouldThrowBusinessRuleException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patient = new Patient { FirstName = "Pat", LastName = "Lee" };
        var doctor = new Doctor { FirstName = "Doc", LastName = "Ray", Specialization = "Pediatrics", DepartmentId = 1 };
        context.Patients.Add(patient);
        context.Doctors.Add(doctor);
        await context.SaveChangesAsync();

        var service = new PrescriptionService(context);
        var dto = new CreatePrescriptionDto
        {
            PatientId = patient.Id,
            DoctorId = doctor.Id,
            Items = new List<CreatePrescriptionItemDto>() // Empty items!
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() => service.CreateAsync(dto));
        Assert.Contains("at least one PrescriptionItem", ex.Message);
    }

    [Fact]
    public async Task CreatePrescription_WithValidItem_ShouldPersistPrescriptionAndItems()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patient = new Patient { FirstName = "Pat", LastName = "Lee" };
        var doctor = new Doctor { FirstName = "Doc", LastName = "Ray", Specialization = "Pediatrics", DepartmentId = 1 };
        context.Patients.Add(patient);
        context.Doctors.Add(doctor);
        await context.SaveChangesAsync();

        var service = new PrescriptionService(context);
        var dto = new CreatePrescriptionDto
        {
            PatientId = patient.Id,
            DoctorId = doctor.Id,
            Items = new List<CreatePrescriptionItemDto>
            {
                new()
                {
                    MedicationName = "Amoxicillin",
                    Dosage = "500mg",
                    Frequency = "Every 8 hours",
                    Duration = "7 days",
                    Instructions = "Take after meals"
                }
            }
        };

        // Act
        var result = await service.CreateAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Items);
        Assert.Equal("Amoxicillin", result.Items[0].MedicationName);
    }
}
