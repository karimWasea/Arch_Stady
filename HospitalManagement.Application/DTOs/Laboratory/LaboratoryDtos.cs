using HospitalManagement.Domain.Enums;

namespace HospitalManagement.Application.DTOs.Laboratory;

// --- Lab Test ---
public class LabTestDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string NormalRange { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Description { get; set; }
}

public class CreateLabTestDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string NormalRange { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Description { get; set; }
}

public class UpdateLabTestDto : CreateLabTestDto { }

// --- Lab Order ---
public class LabOrderItemDto
{
    public int Id { get; set; }
    public int LabTestId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public decimal Price { get; set; }
}

public class LabOrderDto
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public LabPriority Priority { get; set; }
    public string PriorityName => Priority.ToString();
    public LabOrderStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public string? ClinicalNotes { get; set; }
    public List<LabOrderItemDto> Items { get; set; } = new();
    public List<LabResultDto> Results { get; set; } = new();
}

public class CreateLabOrderDto
{
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public LabPriority Priority { get; set; } = LabPriority.Routine;
    public string? ClinicalNotes { get; set; }
    public List<int> TestIds { get; set; } = new();
}

// --- Lab Result ---
public class LabResultDto
{
    public int Id { get; set; }
    public int LabOrderId { get; set; }
    public int LabTestId { get; set; }
    public string TestName { get; set; } = string.Empty;
    public string ResultValue { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = string.Empty;
    public string NormalRange { get; set; } = string.Empty;
    public bool IsAbnormal { get; set; }
    public DateTime PerformedDate { get; set; }
    public string PerformedBy { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}

public class RecordLabResultDto
{
    public int LabOrderId { get; set; }
    public int LabTestId { get; set; }
    public string ResultValue { get; set; } = string.Empty;
    public bool IsAbnormal { get; set; }
    public string PerformedBy { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}
