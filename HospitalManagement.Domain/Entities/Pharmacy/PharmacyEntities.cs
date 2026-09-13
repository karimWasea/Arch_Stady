using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;

namespace HospitalManagement.Domain.Entities.Pharmacy;

/// <summary>
/// Domain Entity / Aggregate Root for pharmaceutical medications in catalog.
/// Enforces pricing and product information invariants.
/// </summary>
public class Medicine
{
    public int Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string GenericName { get; private set; } = string.Empty;
    public string Sku { get; private set; } = string.Empty;
    public DosageForm DosageForm { get; private set; } = DosageForm.Tablet;
    public decimal UnitPrice { get; private set; }
    public string Manufacturer { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public ICollection<Stock> Stocks { get; set; } = new List<Stock>();
    public ICollection<DispensingOrderItem> DispensingOrderItems { get; set; } = new List<DispensingOrderItem>();

    protected Medicine() { }

    public static Medicine Create(
        string name,
        string genericName,
        string sku,
        DosageForm dosageForm,
        decimal unitPrice,
        string manufacturer)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new BusinessRuleException("Medicine name cannot be empty.");

        if (string.IsNullOrWhiteSpace(genericName))
            throw new BusinessRuleException("Generic molecule name cannot be empty.");

        if (string.IsNullOrWhiteSpace(sku))
            throw new BusinessRuleException("SKU cannot be empty.");

        if (unitPrice <= 0m)
            throw new BusinessRuleException("Medicine unit price must be greater than zero.");

        return new Medicine
        {
            Name = name.Trim(),
            GenericName = genericName.Trim(),
            Sku = sku.Trim(),
            DosageForm = dosageForm,
            UnitPrice = unitPrice,
            Manufacturer = manufacturer?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(
        string name,
        string genericName,
        string sku,
        DosageForm dosageForm,
        decimal unitPrice,
        string manufacturer)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new BusinessRuleException("Medicine name cannot be empty.");

        if (string.IsNullOrWhiteSpace(genericName))
            throw new BusinessRuleException("Generic molecule name cannot be empty.");

        if (string.IsNullOrWhiteSpace(sku))
            throw new BusinessRuleException("SKU cannot be empty.");

        if (unitPrice <= 0m)
            throw new BusinessRuleException("Medicine unit price must be greater than zero.");

        Name = name.Trim();
        GenericName = genericName.Trim();
        Sku = sku.Trim();
        DosageForm = dosageForm;
        UnitPrice = unitPrice;
        Manufacturer = manufacturer?.Trim() ?? string.Empty;
    }
}

/// <summary>
/// Domain Entity / Aggregate Root for warehouse inventory batches.
/// Enforces non-negative physical stock quantities and FIFO deductions.
/// </summary>
public class Stock
{
    public int Id { get; private set; }
    public int MedicineId { get; private set; }
    public string BatchNumber { get; private set; } = string.Empty;
    public int QuantityInStock { get; private set; }
    public int ReorderLevel { get; private set; } = 10;
    public DateTime ExpiryDate { get; private set; }
    public string Location { get; private set; } = "Main Shelf";
    public DateTime LastUpdated { get; private set; } = DateTime.UtcNow;

    public Medicine? Medicine { get; set; }

    public bool IsLowStock => QuantityInStock <= ReorderLevel;

    protected Stock() { }

    public static Stock Create(
        int medicineId,
        string batchNumber,
        int initialQuantity,
        int reorderLevel,
        DateTime expiryDate,
        string location)
    {
        if (medicineId <= 0)
            throw new BusinessRuleException("Medicine ID must be greater than zero.");

        if (string.IsNullOrWhiteSpace(batchNumber))
            throw new BusinessRuleException("Batch number cannot be empty.");

        if (initialQuantity < 0)
            throw new BusinessRuleException("Initial stock quantity cannot be negative.");

        if (reorderLevel < 0)
            throw new BusinessRuleException("Reorder level cannot be negative.");

        return new Stock
        {
            MedicineId = medicineId,
            BatchNumber = batchNumber.Trim(),
            QuantityInStock = initialQuantity,
            ReorderLevel = reorderLevel,
            ExpiryDate = expiryDate,
            Location = string.IsNullOrWhiteSpace(location) ? "Main Shelf" : location.Trim(),
            LastUpdated = DateTime.UtcNow
        };
    }

    public void DeductQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new BusinessRuleException("Deduction quantity must be greater than zero.");

        if (quantity > QuantityInStock)
            throw new BusinessRuleException($"Insufficient stock in batch '{BatchNumber}'. Available: {QuantityInStock}, Requested: {quantity}");

        QuantityInStock -= quantity;
        LastUpdated = DateTime.UtcNow;
    }

    public void AddQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new BusinessRuleException("Added quantity must be greater than zero.");

        QuantityInStock += quantity;
        LastUpdated = DateTime.UtcNow;
    }

    public void UpdateDetails(int quantityInStock, int reorderLevel, string location)
    {
        if (quantityInStock < 0)
            throw new BusinessRuleException("Quantity in stock cannot be negative.");

        if (reorderLevel < 0)
            throw new BusinessRuleException("Reorder level cannot be negative.");

        QuantityInStock = quantityInStock;
        ReorderLevel = reorderLevel;
        Location = string.IsNullOrWhiteSpace(location) ? "Main Shelf" : location.Trim();
        LastUpdated = DateTime.UtcNow;
    }

    public bool IsExpired(DateTime referenceTime) => ExpiryDate < referenceTime;
}

/// <summary>
/// Domain Aggregate Root for pharmacy medication dispensing orders.
/// Protects line item integrity and total financial summation.
/// </summary>
public class DispensingOrder
{
    public int Id { get; private set; }
    public int PatientId { get; private set; }
    public int? DoctorId { get; private set; }
    public int? PrescriptionId { get; private set; }
    public DateTime DispensedDate { get; private set; } = DateTime.UtcNow;
    public decimal TotalAmount { get; private set; }
    public DispensingStatus Status { get; private set; } = DispensingStatus.Dispensed;
    public string? Notes { get; private set; }

    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public Prescription? Prescription { get; set; }

    private readonly List<DispensingOrderItem> _items = new();
    public IReadOnlyCollection<DispensingOrderItem> Items => _items.AsReadOnly();

    protected DispensingOrder() { }

    public static DispensingOrder Create(
        int patientId,
        int? doctorId,
        int? prescriptionId,
        IEnumerable<DispensingOrderItem> items,
        string? notes = null,
        DateTime? dispensedDate = null)
    {
        if (patientId <= 0)
            throw new BusinessRuleException("Patient ID must be greater than zero.");

        var itemList = items?.ToList() ?? new List<DispensingOrderItem>();
        if (itemList.Count == 0)
            throw new BusinessRuleException("Dispensing order must contain at least one medication item.");

        var order = new DispensingOrder
        {
            PatientId = patientId,
            DoctorId = doctorId,
            PrescriptionId = prescriptionId,
            DispensedDate = dispensedDate ?? DateTime.UtcNow,
            Notes = notes,
            Status = DispensingStatus.Dispensed,
            TotalAmount = itemList.Sum(i => i.SubTotal)
        };

        order._items.AddRange(itemList);
        return order;
    }

    public void Cancel()
    {
        if (Status == DispensingStatus.Cancelled)
            throw new BusinessRuleException("Dispensing order is already cancelled.");

        Status = DispensingStatus.Cancelled;
    }
}

/// <summary>
/// Child entity of DispensingOrder aggregate.
/// Represents a dispensed medication line item.
/// </summary>
public class DispensingOrderItem
{
    public int Id { get; private set; }
    public int DispensingOrderId { get; private set; }
    public int MedicineId { get; private set; }
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }
    public decimal SubTotal { get; private set; }

    public DispensingOrder? DispensingOrder { get; set; }
    public Medicine? Medicine { get; set; }

    protected DispensingOrderItem() { }

    public static DispensingOrderItem Create(int medicineId, int quantity, decimal unitPrice)
    {
        if (medicineId <= 0)
            throw new BusinessRuleException("Medicine ID must be greater than zero.");

        if (quantity <= 0)
            throw new BusinessRuleException("Dispensed quantity must be greater than zero.");

        if (unitPrice < 0m)
            throw new BusinessRuleException("Unit price cannot be negative.");

        return new DispensingOrderItem
        {
            MedicineId = medicineId,
            Quantity = quantity,
            UnitPrice = unitPrice,
            SubTotal = quantity * unitPrice
        };
    }
}
