using HospitalManagement.Core.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HospitalManagement.Adapters.Persistence.Configurations;

public class PrescriptionItemConfiguration : IEntityTypeConfiguration<PrescriptionItem>
{
    public void Configure(EntityTypeBuilder<PrescriptionItem> builder)
    {
        builder.ToTable("PrescriptionItems");

        builder.HasKey(pi => pi.Id);

        builder.Property(pi => pi.MedicationName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(pi => pi.Dosage)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(pi => pi.Frequency)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(pi => pi.Duration)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(pi => pi.Instructions)
            .HasMaxLength(500);

        builder.HasOne(pi => pi.Prescription)
            .WithMany(pr => pr.PrescriptionItems)
            .HasForeignKey(pi => pi.PrescriptionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
