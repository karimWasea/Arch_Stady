using HospitalManagement.Domain.Entities.Laboratory;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HospitalManagement.Infrastructure.Data.Configurations;

public class LabTestConfiguration : IEntityTypeConfiguration<LabTest>
{
    public void Configure(EntityTypeBuilder<LabTest> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(t => t.Code).IsUnique();
        builder.Property(t => t.Name).IsRequired().HasMaxLength(150);
        builder.Property(t => t.Category).IsRequired().HasMaxLength(100);
        builder.Property(t => t.NormalRange).HasMaxLength(100);
        builder.Property(t => t.UnitOfMeasure).HasMaxLength(50);
        builder.Property(t => t.Price).HasPrecision(18, 2);
        builder.Property(t => t.Description).HasMaxLength(500);
    }
}

public class LabOrderConfiguration : IEntityTypeConfiguration<LabOrder>
{
    public void Configure(EntityTypeBuilder<LabOrder> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.ClinicalNotes).HasMaxLength(1000);

        builder.HasOne(o => o.Patient)
            .WithMany(p => p.LabOrders)
            .HasForeignKey(o => o.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.Doctor)
            .WithMany(d => d.LabOrders)
            .HasForeignKey(o => o.DoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(o => o.Items)
            .WithOne(i => i.LabOrder)
            .HasForeignKey(i => i.LabOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(o => o.Results)
            .WithOne(r => r.LabOrder)
            .HasForeignKey(r => r.LabOrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class LabOrderItemConfiguration : IEntityTypeConfiguration<LabOrderItem>
{
    public void Configure(EntityTypeBuilder<LabOrderItem> builder)
    {
        builder.HasKey(i => i.Id);

        builder.HasOne(i => i.LabTest)
            .WithMany(t => t.LabOrderItems)
            .HasForeignKey(i => i.LabTestId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class LabResultConfiguration : IEntityTypeConfiguration<LabResult>
{
    public void Configure(EntityTypeBuilder<LabResult> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.ResultValue).IsRequired().HasMaxLength(100);
        builder.Property(r => r.UnitOfMeasure).HasMaxLength(50);
        builder.Property(r => r.NormalRange).HasMaxLength(100);
        builder.Property(r => r.PerformedBy).IsRequired().HasMaxLength(100);
        builder.Property(r => r.Remarks).HasMaxLength(500);

        builder.HasOne(r => r.LabTest)
            .WithMany(t => t.LabResults)
            .HasForeignKey(r => r.LabTestId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
