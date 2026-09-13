using HospitalManagement.Domain.Entities.Pharmacy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HospitalManagement.Infrastructure.Data.Configurations;

public class MedicineConfiguration : IEntityTypeConfiguration<Medicine>
{
    public void Configure(EntityTypeBuilder<Medicine> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Name).IsRequired().HasMaxLength(150);
        builder.Property(m => m.GenericName).IsRequired().HasMaxLength(150);
        builder.Property(m => m.Sku).IsRequired().HasMaxLength(50);
        builder.HasIndex(m => m.Sku).IsUnique();
        builder.Property(m => m.Manufacturer).HasMaxLength(100);
        builder.Property(m => m.UnitPrice).HasPrecision(18, 2);

        builder.HasMany(m => m.Stocks)
            .WithOne(s => s.Medicine)
            .HasForeignKey(s => s.MedicineId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class StockConfiguration : IEntityTypeConfiguration<Stock>
{
    public void Configure(EntityTypeBuilder<Stock> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.BatchNumber).IsRequired().HasMaxLength(50);
        builder.Property(s => s.Location).HasMaxLength(100);

        builder.HasIndex(s => new { s.MedicineId, s.BatchNumber });
    }
}

public class DispensingOrderConfiguration : IEntityTypeConfiguration<DispensingOrder>
{
    public void Configure(EntityTypeBuilder<DispensingOrder> builder)
    {
        builder.HasKey(d => d.Id);
        builder.Property(d => d.TotalAmount).HasPrecision(18, 2);
        builder.Property(d => d.Notes).HasMaxLength(500);

        builder.HasOne(d => d.Patient)
            .WithMany(p => p.DispensingOrders)
            .HasForeignKey(d => d.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Doctor)
            .WithMany()
            .HasForeignKey(d => d.DoctorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Prescription)
            .WithMany(p => p.DispensingOrders)
            .HasForeignKey(d => d.PrescriptionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(d => d.Items)
            .WithOne(i => i.DispensingOrder)
            .HasForeignKey(i => i.DispensingOrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class DispensingOrderItemConfiguration : IEntityTypeConfiguration<DispensingOrderItem>
{
    public void Configure(EntityTypeBuilder<DispensingOrderItem> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.UnitPrice).HasPrecision(18, 2);
        builder.Property(i => i.SubTotal).HasPrecision(18, 2);

        builder.HasOne(i => i.Medicine)
            .WithMany(m => m.DispensingOrderItems)
            .HasForeignKey(i => i.MedicineId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
