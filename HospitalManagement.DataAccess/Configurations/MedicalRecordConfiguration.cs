using HospitalManagement.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HospitalManagement.DataAccess.Configurations;

public class MedicalRecordConfiguration : IEntityTypeConfiguration<MedicalRecord>
{
    public void Configure(EntityTypeBuilder<MedicalRecord> builder)
    {
        builder.ToTable("MedicalRecords");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Diagnosis)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(m => m.Symptoms)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(m => m.Treatment)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(m => m.Notes)
            .HasMaxLength(1000);

        builder.HasOne(m => m.Patient)
            .WithMany(p => p.MedicalRecords)
            .HasForeignKey(m => m.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Doctor)
            .WithMany(d => d.MedicalRecords)
            .HasForeignKey(m => m.DoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Appointment)
            .WithMany()
            .HasForeignKey(m => m.AppointmentId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
