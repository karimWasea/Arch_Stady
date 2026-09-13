using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;

namespace HospitalManagement.Domain.Entities.Pharmacy;

public class Medicine
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string GenericName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public DosageForm DosageForm { get; set; } = DosageForm.Tablet;
    public decimal UnitPrice { get; set; }
    public string Manufacturer { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Stock> Stocks { get; set; } = new List<Stock>();
    public ICollection<DispensingOrderItem> DispensingOrderItems { get; set; } = new List<DispensingOrderItem>();
}

public class Stock
{
    public int Id { get; set; }
    public int MedicineId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public int QuantityInStock { get; set; }
    public int ReorderLevel { get; set; } = 10;
    public DateTime ExpiryDate { get; set; }
    public string Location { get; set; } = "Main Shelf";
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    public Medicine? Medicine { get; set; }
}

public class DispensingOrder
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int? DoctorId { get; set; }
    public int? PrescriptionId { get; set; }
    public DateTime DispensedDate { get; set; } = DateTime.UtcNow;
    public decimal TotalAmount { get; set; }
    public DispensingStatus Status { get; set; } = DispensingStatus.Dispensed;
    public string? Notes { get; set; }

    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public Prescription? Prescription { get; set; }
    public ICollection<DispensingOrderItem> Items { get; set; } = new List<DispensingOrderItem>();
}

public class DispensingOrderItem
{
    public int Id { get; set; }
    public int DispensingOrderId { get; set; }
    public int MedicineId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SubTotal { get; set; }

    public DispensingOrder? DispensingOrder { get; set; }
    public Medicine? Medicine { get; set; }
}
