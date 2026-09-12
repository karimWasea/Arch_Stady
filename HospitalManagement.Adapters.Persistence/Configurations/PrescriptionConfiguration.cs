using HospitalManagement.Core.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HospitalManagement.Adapters.Persistence.Configurations;

public class PrescriptionConfiguration : IEntityTypeConfiguration<Prescription>
{
    public void Configure(EntityTypeBuilder<Prescription> builder)
    {
        builder.ToTable("Prescriptions");

        builder.HasKey(pr => pr.Id);

        builder.Property(pr => pr.Notes)
            .HasMaxLength(1000);

        builder.HasOne(pr => pr.Patient)
            .WithMany(p => p.Prescriptions)
            .HasForeignKey(pr => pr.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pr => pr.Doctor)
            .WithMany(d => d.Prescriptions)
            .HasForeignKey(pr => pr.DoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pr => pr.Appointment)
            .WithMany()
            .HasForeignKey(pr => pr.AppointmentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(pr => pr.PrescriptionItems)
            .WithOne(pi => pi.Prescription)
            .HasForeignKey(pi => pi.PrescriptionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
