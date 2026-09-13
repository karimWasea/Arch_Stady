using HospitalManagement.Domain.Enums;

namespace HospitalManagement.Application.DTOs.Pharmacy;

// --- Medicine ---
public class MedicineDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string GenericName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public DosageForm DosageForm { get; set; }
    public string DosageFormName => DosageForm.ToString();
    public decimal UnitPrice { get; set; }
    public string Manufacturer { get; set; } = string.Empty;
    public int TotalStock { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateMedicineDto
{
    public string Name { get; set; } = string.Empty;
    public string GenericName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public DosageForm DosageForm { get; set; } = DosageForm.Tablet;
    public decimal UnitPrice { get; set; }
    public string Manufacturer { get; set; } = string.Empty;
}

public class UpdateMedicineDto : CreateMedicineDto { }

// --- Stock ---
public class StockDto
{
    public int Id { get; set; }
    public int MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public int QuantityInStock { get; set; }
    public int ReorderLevel { get; set; }
    public DateTime ExpiryDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public bool IsLowStock => QuantityInStock <= ReorderLevel;
    public bool IsExpired => ExpiryDate < DateTime.UtcNow;
    public DateTime LastUpdated { get; set; }
}

public class AddStockDto
{
    public int MedicineId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int ReorderLevel { get; set; } = 10;
    public DateTime ExpiryDate { get; set; }
    public string Location { get; set; } = "Shelf A-1";
}

public class UpdateStockDto
{
    public int QuantityInStock { get; set; }
    public int ReorderLevel { get; set; }
    public string Location { get; set; } = string.Empty;
}

// --- Dispensing ---
public class DispenseItemDto
{
    public int MedicineId { get; set; }
    public int Quantity { get; set; }
}

public class DispenseOrderRequestDto
{
    public int PatientId { get; set; }
    public int? DoctorId { get; set; }
    public int? PrescriptionId { get; set; }
    public string? Notes { get; set; }
    public List<DispenseItemDto> Items { get; set; } = new();
}

public class DispensingOrderItemDto
{
    public int Id { get; set; }
    public int MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SubTotal { get; set; }
}

public class DispensingOrderDto
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int? DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public int? PrescriptionId { get; set; }
    public DateTime DispensedDate { get; set; }
    public decimal TotalAmount { get; set; }
    public DispensingStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public string? Notes { get; set; }
    public List<DispensingOrderItemDto> Items { get; set; } = new();
}
