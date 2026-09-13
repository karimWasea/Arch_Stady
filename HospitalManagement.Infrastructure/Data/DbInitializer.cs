using System.Security.Cryptography;
using System.Text;
using HospitalManagement.Domain.Entities.Billing;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Entities.Laboratory;
using HospitalManagement.Domain.Entities.Pharmacy;
using HospitalManagement.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        if (await context.Departments.AnyAsync())
        {
            return; // DB already seeded
        }

        // 1. Seed Departments
        var cardiology = new Department { Name = "Cardiology", Description = "Heart and cardiovascular care" };
        var pediatrics = new Department { Name = "Pediatrics", Description = "Care for infants, children, and adolescents" };
        var neurology = new Department { Name = "Neurology", Description = "Disorders of the nervous system and brain" };
        var orthopedics = new Department { Name = "Orthopedics", Description = "Musculoskeletal system, bones, joints" };

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
                Notes = "Routine cardiovascular checkup"
            },
            new Appointment
            {
                PatientId = patients[1].Id,
                DoctorId = doctors[1].Id,
                AppointmentDate = DateTime.UtcNow.AddDays(1).Date.AddHours(10),
                Status = AppointmentStatus.Scheduled,
                Notes = "Annual wellness checkup"
            }
        };

        context.Appointments.AddRange(appointments);
        await context.SaveChangesAsync();

        // 5. Seed Users
        using var hmacAdmin = new HMACSHA512();
        var adminSalt = hmacAdmin.Key;
        var adminHash = hmacAdmin.ComputeHash(Encoding.UTF8.GetBytes("Admin123!"));

        using var hmacDoctor = new HMACSHA512();
        var doctorSalt = hmacDoctor.Key;
        var doctorHash = hmacDoctor.ComputeHash(Encoding.UTF8.GetBytes("Doctor123!"));

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

        // 6. Seed Pharmacy - Medicines & Stock Batches
        var amoxicillin = new Medicine
        {
            Name = "Amoxicillin 500mg",
            GenericName = "Amoxicillin Trihydrate",
            Sku = "MED-AMOX-500",
            DosageForm = DosageForm.Capsule,
            UnitPrice = 12.50m,
            Manufacturer = "Pfizer Global"
        };

        var paracetamol = new Medicine
        {
            Name = "Paracetamol 500mg",
            GenericName = "Acetaminophen",
            Sku = "MED-PARA-500",
            DosageForm = DosageForm.Tablet,
            UnitPrice = 4.25m,
            Manufacturer = "GSK Healthcare"
        };

        var metformin = new Medicine
        {
            Name = "Metformin 850mg",
            GenericName = "Metformin Hydrochloride",
            Sku = "MED-METF-850",
            DosageForm = DosageForm.Tablet,
            UnitPrice = 8.75m,
            Manufacturer = "Merck"
        };

        var atorvastatin = new Medicine
        {
            Name = "Atorvastatin 20mg",
            GenericName = "Atorvastatin Calcium",
            Sku = "MED-ATOR-020",
            DosageForm = DosageForm.Tablet,
            UnitPrice = 18.00m,
            Manufacturer = "Novartis"
        };

        context.Medicines.AddRange(amoxicillin, paracetamol, metformin, atorvastatin);
        await context.SaveChangesAsync();

        var stocks = new List<Stock>
        {
            new Stock { MedicineId = amoxicillin.Id, BatchNumber = "BATCH-AMX-001", QuantityInStock = 100, ReorderLevel = 20, ExpiryDate = DateTime.UtcNow.AddYears(2), Location = "Shelf A1-03" },
            new Stock { MedicineId = paracetamol.Id, BatchNumber = "BATCH-PAR-002", QuantityInStock = 300, ReorderLevel = 50, ExpiryDate = DateTime.UtcNow.AddYears(3), Location = "Shelf B2-01" },
            new Stock { MedicineId = metformin.Id, BatchNumber = "BATCH-MET-003", QuantityInStock = 150, ReorderLevel = 30, ExpiryDate = DateTime.UtcNow.AddYears(1), Location = "Shelf C1-05" },
            new Stock { MedicineId = atorvastatin.Id, BatchNumber = "BATCH-ATO-004", QuantityInStock = 80, ReorderLevel = 15, ExpiryDate = DateTime.UtcNow.AddYears(2), Location = "Shelf A2-04" }
        };

        context.Stocks.AddRange(stocks);
        await context.SaveChangesAsync();

        // 7. Seed Laboratory Tests
        var labTests = new List<LabTest>
        {
            new LabTest
            {
                Code = "LAB-CBC",
                Name = "Complete Blood Count (CBC)",
                Category = "Hematology",
                Description = "Measures white and red blood cells, hemoglobin, and platelets.",
                NormalRange = "WBC: 4.5-11.0 K/uL, RBC: 4.3-5.9 M/uL, Hgb: 13.5-17.5 g/dL",
                UnitOfMeasure = "Standard Panel",
                Price = 35.00m
            },
            new LabTest
            {
                Code = "LAB-LIPID",
                Name = "Comprehensive Lipid Panel",
                Category = "Clinical Biochemistry",
                Description = "Total cholesterol, HDL, LDL, and triglycerides assessment.",
                NormalRange = "Total < 200 mg/dL, LDL < 100 mg/dL, HDL > 40 mg/dL",
                UnitOfMeasure = "mg/dL",
                Price = 45.00m
            },
            new LabTest
            {
                Code = "LAB-GLUC",
                Name = "Fasting Blood Glucose",
                Category = "Metabolic",
                Description = "Measures blood sugar level after an overnight fast.",
                NormalRange = "70-99 mg/dL",
                UnitOfMeasure = "mg/dL",
                Price = 20.00m
            },
            new LabTest
            {
                Code = "LAB-LFT",
                Name = "Liver Function Panel (LFT)",
                Category = "Biochemistry",
                Description = "ALT, AST, ALP, Bilirubin, and Albumin biomarker evaluation.",
                NormalRange = "ALT: 7-56 U/L, AST: 10-40 U/L, ALP: 44-147 U/L",
                UnitOfMeasure = "U/L",
                Price = 55.00m
            }
        };

        context.LabTests.AddRange(labTests);
        await context.SaveChangesAsync();

        // 8. Seed Billing - Insurance Plans
        var insurance1 = new Insurance
        {
            PatientId = patients[0].Id,
            ProviderName = "BlueCross Health Shield",
            PolicyNumber = "BC-9928371-A",
            CoveragePercentage = 80.00m,
            MaxCoverageAmount = 5000.00m,
            ExpiryDate = DateTime.UtcNow.AddYears(1),
            IsActive = true
        };

        var insurance2 = new Insurance
        {
            PatientId = patients[1].Id,
            ProviderName = "Aetna Premier Care",
            PolicyNumber = "AET-449102-X",
            CoveragePercentage = 75.00m,
            MaxCoverageAmount = 3500.00m,
            ExpiryDate = DateTime.UtcNow.AddYears(1),
            IsActive = true
        };

        context.Insurances.AddRange(insurance1, insurance2);
        await context.SaveChangesAsync();
    }
}
