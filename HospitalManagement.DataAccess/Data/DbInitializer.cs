using HospitalManagement.DataAccess.Context;
using HospitalManagement.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.DataAccess.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        if (await context.Departments.AnyAsync())
        {
            return; // DB already seeded
        }

        // 1. Seed Departments
        var cardiology = new Department { Name = "Cardiology", Description = "Heart and cardiovascular system care" };
        var pediatrics = new Department { Name = "Pediatrics", Description = "Medical care for infants, children, and adolescents" };
        var neurology = new Department { Name = "Neurology", Description = "Disorders of the nervous system and brain" };
        var orthopedics = new Department { Name = "Orthopedics", Description = "Musculoskeletal system, bones, joints, and spine" };

        context.Departments.AddRange(cardiology, pediatrics, neurology, orthopedics);
        await context.SaveChangesAsync();

        // 2. Seed Doctors
        var doctors = new List<Doctor>
        {
            new Doctor
            {
                FirstName = "Sarah",
                LastName = "Jenkins",
                Specialization = "Cardiologist",
                Phone = "+1-555-0101",
                Email = "s.jenkins@hospital.org",
                DepartmentId = cardiology.Id
            },
            new Doctor
            {
                FirstName = "Michael",
                LastName = "Chang",
                Specialization = "Pediatric Specialist",
                Phone = "+1-555-0102",
                Email = "m.chang@hospital.org",
                DepartmentId = pediatrics.Id
            },
            new Doctor
            {
                FirstName = "Elena",
                LastName = "Rostova",
                Specialization = "Neurologist",
                Phone = "+1-555-0103",
                Email = "e.rostova@hospital.org",
                DepartmentId = neurology.Id
            },
            new Doctor
            {
                FirstName = "David",
                LastName = "Miller",
                Specialization = "Orthopedic Surgeon",
                Phone = "+1-555-0104",
                Email = "d.miller@hospital.org",
                DepartmentId = orthopedics.Id
            }
        };

        context.Doctors.AddRange(doctors);
        await context.SaveChangesAsync();

        // 3. Seed Patients
        var patients = new List<Patient>
        {
            new Patient
            {
                FirstName = "John",
                LastName = "Doe",
                DateOfBirth = new DateTime(1985, 4, 12, 0, 0, 0, DateTimeKind.Utc),
                Gender = "Male",
                Phone = "+1-555-0201",
                Email = "john.doe@example.com",
                Address = "123 Maple Street, Cityville"
            },
            new Patient
            {
                FirstName = "Jane",
                LastName = "Smith",
                DateOfBirth = new DateTime(1992, 8, 24, 0, 0, 0, DateTimeKind.Utc),
                Gender = "Female",
                Phone = "+1-555-0202",
                Email = "jane.smith@example.com",
                Address = "456 Oak Avenue, Metropolis"
            },
            new Patient
            {
                FirstName = "Robert",
                LastName = "Johnson",
                DateOfBirth = new DateTime(1978, 11, 3, 0, 0, 0, DateTimeKind.Utc),
                Gender = "Male",
                Phone = "+1-555-0203",
                Email = "r.johnson@example.com",
                Address = "789 Pine Road, Suburbia"
            },
            new Patient
            {
                FirstName = "Emily",
                LastName = "Williams",
                DateOfBirth = new DateTime(2000, 1, 15, 0, 0, 0, DateTimeKind.Utc),
                Gender = "Female",
                Phone = "+1-555-0204",
                Email = "emily.w@example.com",
                Address = "321 Cedar Boulevard, Townsville"
            },
            new Patient
            {
                FirstName = "Carlos",
                LastName = "Garcia",
                DateOfBirth = new DateTime(1965, 6, 30, 0, 0, 0, DateTimeKind.Utc),
                Gender = "Male",
                Phone = "+1-555-0205",
                Email = "c.garcia@example.com",
                Address = "654 Elm Court, Riverdale"
            }
        };

        context.Patients.AddRange(patients);
        await context.SaveChangesAsync();

        // 4. Seed Appointments
        var appointments = new List<Appointment>
        {
            new Appointment
            {
                PatientId = patients[0].Id,
                DoctorId = doctors[0].Id,
                AppointmentDate = DateTime.UtcNow.AddDays(1).Date.AddHours(9),
                Status = AppointmentStatus.Scheduled,
                Notes = "Routine cardiac checkup"
            },
            new Appointment
            {
                PatientId = patients[1].Id,
                DoctorId = doctors[1].Id,
                AppointmentDate = DateTime.UtcNow.AddDays(1).Date.AddHours(10),
                Status = AppointmentStatus.Scheduled,
                Notes = "Annual pediatric wellness consultation"
            },
            new Appointment
            {
                PatientId = patients[2].Id,
                DoctorId = doctors[3].Id,
                AppointmentDate = DateTime.UtcNow.AddDays(2).Date.AddHours(14),
                Status = AppointmentStatus.Scheduled,
                Notes = "Follow-up on knee pain after sports injury"
            }
        };

        context.Appointments.AddRange(appointments);
        await context.SaveChangesAsync();

        // 5. Seed Default Users (Admin and Doctor)
        using var hmacAdmin = new System.Security.Cryptography.HMACSHA512();
        var adminSalt = hmacAdmin.Key;
        var adminHash = hmacAdmin.ComputeHash(System.Text.Encoding.UTF8.GetBytes("Admin123!"));

        using var hmacDoctor = new System.Security.Cryptography.HMACSHA512();
        var doctorSalt = hmacDoctor.Key;
        var doctorHash = hmacDoctor.ComputeHash(System.Text.Encoding.UTF8.GetBytes("Doctor123!"));

        var users = new List<User>
        {
            new User
            {
                Username = "admin",
                Email = "admin@hospital.org",
                FullName = "System Administrator",
                Role = UserRole.Admin,
                PasswordHash = adminHash,
                PasswordSalt = adminSalt,
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Username = "dr.jenkins",
                Email = "s.jenkins@hospital.org",
                FullName = "Dr. Sarah Jenkins",
                Role = UserRole.Doctor,
                PasswordHash = doctorHash,
                PasswordSalt = doctorSalt,
                CreatedAt = DateTime.UtcNow
            }
        };

        context.Users.AddRange(users);
        await context.SaveChangesAsync();
    }
}
