using System.Reflection;
using HospitalManagement.Domain.Entities.Billing;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Entities.Laboratory;
using HospitalManagement.Domain.Entities.Pharmacy;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Clinical
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<MedicalRecord> MedicalRecords => Set<MedicalRecord>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();
    public DbSet<User> Users => Set<User>();

    // Pharmacy
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<Stock> Stocks => Set<Stock>();
    public DbSet<DispensingOrder> DispensingOrders => Set<DispensingOrder>();
    public DbSet<DispensingOrderItem> DispensingOrderItems => Set<DispensingOrderItem>();

    // Laboratory
    public DbSet<LabTest> LabTests => Set<LabTest>();
    public DbSet<LabOrder> LabOrders => Set<LabOrder>();
    public DbSet<LabOrderItem> LabOrderItems => Set<LabOrderItem>();
    public DbSet<LabResult> LabResults => Set<LabResult>();

    // Billing
    public DbSet<Insurance> Insurances => Set<Insurance>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
