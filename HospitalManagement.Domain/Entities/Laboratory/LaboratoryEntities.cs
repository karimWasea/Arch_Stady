using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;

namespace HospitalManagement.Domain.Entities.Laboratory;

public class LabTest
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string NormalRange { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Description { get; set; }

    public ICollection<LabOrderItem> LabOrderItems { get; set; } = new List<LabOrderItem>();
    public ICollection<LabResult> LabResults { get; set; } = new List<LabResult>();
}

public class LabOrder
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public LabPriority Priority { get; set; } = LabPriority.Routine;
    public LabOrderStatus Status { get; set; } = LabOrderStatus.Ordered;
    public string? ClinicalNotes { get; set; }

    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public ICollection<LabOrderItem> Items { get; set; } = new List<LabOrderItem>();
    public ICollection<LabResult> Results { get; set; } = new List<LabResult>();
}

public class LabOrderItem
{
    public int Id { get; set; }
    public int LabOrderId { get; set; }
    public int LabTestId { get; set; }

    public LabOrder? LabOrder { get; set; }
    public LabTest? LabTest { get; set; }
}

public class LabResult
{
    public int Id { get; set; }
    public int LabOrderId { get; set; }
    public int LabTestId { get; set; }
    public string ResultValue { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = string.Empty;
    public string NormalRange { get; set; } = string.Empty;
    public bool IsAbnormal { get; set; }
    public DateTime PerformedDate { get; set; } = DateTime.UtcNow;
    public string PerformedBy { get; set; } = string.Empty;
    public string? Remarks { get; set; }

    public LabOrder? LabOrder { get; set; }
    public LabTest? LabTest { get; set; }
}
