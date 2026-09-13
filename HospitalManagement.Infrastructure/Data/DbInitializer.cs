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
        var cardiology = Department.Create("Cardiology", "Heart and cardiovascular care");
        var pediatrics = Department.Create("Pediatrics", "Care for infants, children, and adolescents");
        var neurology = Department.Create("Neurology", "Disorders of the nervous system and brain");
        var orthopedics = Department.Create("Orthopedics", "Musculoskeletal system, bones, joints");

        context.Departments.AddRange(cardiology, pediatrics, neurology, orthopedics);
        await context.SaveChangesAsync();

        // 2. Seed Doctors
        var doctors = new List<Doctor>
        {
            Doctor.Create("Sarah", "Jenkins", "Cardiologist", "+1-555-0101", "s.jenkins@hospital.org", cardiology.Id),
            Doctor.Create("Michael", "Chang", "Pediatric Specialist", "+1-555-0102", "m.chang@hospital.org", pediatrics.Id),
            Doctor.Create("Elena", "Rostova", "Neurologist", "+1-555-0103", "e.rostova@hospital.org", neurology.Id),
            Doctor.Create("David", "Miller", "Orthopedic Surgeon", "+1-555-0104", "d.miller@hospital.org", orthopedics.Id)
        };

        context.Doctors.AddRange(doctors);
        await context.SaveChangesAsync();

        // 3. Seed Patients
        var patients = new List<Patient>
        {
            Patient.Create("John", "Doe", new DateTime(1985, 4, 12, 0, 0, 0, DateTimeKind.Utc), "Male", "+1-555-0201", "john.doe@example.com", "123 Maple Street, Cityville"),
            Patient.Create("Jane", "Smith", new DateTime(1992, 8, 24, 0, 0, 0, DateTimeKind.Utc), "Female", "+1-555-0202", "jane.smith@example.com", "456 Oak Avenue, Metropolis"),
            Patient.Create("Robert", "Johnson", new DateTime(1978, 11, 3, 0, 0, 0, DateTimeKind.Utc), "Male", "+1-555-0203", "r.johnson@example.com", "789 Pine Road, Suburbia")
        };

        context.Patients.AddRange(patients);
        await context.SaveChangesAsync();

        // 4. Seed Appointments
        var appointments = new List<Appointment>
        {
            Appointment.Create(patients[0].Id, doctors[0].Id, DateTime.UtcNow.AddDays(1).Date.AddHours(9), "Routine cardiovascular checkup"),
            Appointment.Create(patients[1].Id, doctors[1].Id, DateTime.UtcNow.AddDays(1).Date.AddHours(10), "Annual wellness checkup")
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
            User.Create("admin", "admin@hospital.org", "System Administrator", adminHash, adminSalt, UserRole.Admin),
            User.Create("dr.jenkins", "s.jenkins@hospital.org", "Dr. Sarah Jenkins", doctorHash, doctorSalt, UserRole.Doctor)
        };

        context.Users.AddRange(users);
        await context.SaveChangesAsync();

        // 6. Seed Pharmacy - Medicines & Stock Batches
        var amoxicillin = Medicine.Create("Amoxicillin 500mg", "Amoxicillin Trihydrate", "MED-AMOX-500", DosageForm.Capsule, 12.50m, "Pfizer Global");
        var paracetamol = Medicine.Create("Paracetamol 500mg", "Acetaminophen", "MED-PARA-500", DosageForm.Tablet, 4.25m, "GSK Healthcare");
        var metformin = Medicine.Create("Metformin 850mg", "Metformin Hydrochloride", "MED-METF-850", DosageForm.Tablet, 8.75m, "Merck");
        var atorvastatin = Medicine.Create("Atorvastatin 20mg", "Atorvastatin Calcium", "MED-ATOR-020", DosageForm.Tablet, 18.00m, "Novartis");

        context.Medicines.AddRange(amoxicillin, paracetamol, metformin, atorvastatin);
        await context.SaveChangesAsync();

        var stocks = new List<Stock>
        {
            Stock.Create(amoxicillin.Id, "BATCH-AMX-001", 100, 20, DateTime.UtcNow.AddYears(2), "Shelf A1-03"),
            Stock.Create(paracetamol.Id, "BATCH-PAR-002", 300, 50, DateTime.UtcNow.AddYears(3), "Shelf B2-01"),
            Stock.Create(metformin.Id, "BATCH-MET-003", 150, 30, DateTime.UtcNow.AddYears(1), "Shelf C1-05"),
            Stock.Create(atorvastatin.Id, "BATCH-ATO-004", 80, 15, DateTime.UtcNow.AddYears(2), "Shelf A2-04")
        };

        context.Stocks.AddRange(stocks);
        await context.SaveChangesAsync();

        // 7. Seed Laboratory Tests
        var labTests = new List<LabTest>
        {
            LabTest.Create("LAB-CBC", "Complete Blood Count (CBC)", "Hematology", "WBC: 4.5-11.0 K/uL, RBC: 4.3-5.9 M/uL, Hgb: 13.5-17.5 g/dL", "Standard Panel", 35.00m, "Measures white and red blood cells, hemoglobin, and platelets."),
            LabTest.Create("LAB-LIPID", "Comprehensive Lipid Panel", "Clinical Biochemistry", "Total < 200 mg/dL, LDL < 100 mg/dL, HDL > 40 mg/dL", "mg/dL", 45.00m, "Total cholesterol, HDL, LDL, and triglycerides assessment."),
            LabTest.Create("LAB-GLUC", "Fasting Blood Glucose", "Metabolic", "70-99 mg/dL", "mg/dL", 20.00m, "Measures blood sugar level after an overnight fast."),
            LabTest.Create("LAB-LFT", "Liver Function Panel (LFT)", "Biochemistry", "ALT: 7-56 U/L, AST: 10-40 U/L, ALP: 44-147 U/L", "U/L", 55.00m, "ALT, AST, ALP, Bilirubin, and Albumin biomarker evaluation.")
        };

        context.LabTests.AddRange(labTests);
        await context.SaveChangesAsync();

        // 8. Seed Billing - Insurance Plans
        var insurance1 = Insurance.Create(patients[0].Id, "BlueCross Health Shield", "BC-9928371-A", 80.00m, 5000.00m, DateTime.UtcNow.AddYears(1));
        var insurance2 = Insurance.Create(patients[1].Id, "Aetna Premier Care", "AET-449102-X", 75.00m, 3500.00m, DateTime.UtcNow.AddYears(1));

        context.Insurances.AddRange(insurance1, insurance2);
        await context.SaveChangesAsync();
    }
}
