using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;

namespace HospitalManagement.Domain.Entities.Laboratory;

/// <summary>
/// Domain Entity / Aggregate Root for laboratory diagnostic test definitions.
/// Enforces test code and pricing invariants.
/// </summary>
public class LabTest
{
    public int Id { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Category { get; private set; } = "General";
    public string NormalRange { get; private set; } = string.Empty;
    public string UnitOfMeasure { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public string? Description { get; private set; }

    public ICollection<LabOrderItem> LabOrderItems { get; set; } = new List<LabOrderItem>();
    public ICollection<LabResult> LabResults { get; set; } = new List<LabResult>();

    protected LabTest() { }

    public static LabTest Create(
        string code,
        string name,
        string category,
        string normalRange,
        string unitOfMeasure,
        decimal price,
        string? description = null)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new BusinessRuleException("Lab test code cannot be empty.");

        if (string.IsNullOrWhiteSpace(name))
            throw new BusinessRuleException("Lab test name cannot be empty.");

        if (price < 0m)
            throw new BusinessRuleException("Lab test price cannot be negative.");

        return new LabTest
        {
            Code = code.Trim().ToUpperInvariant(),
            Name = name.Trim(),
            Category = string.IsNullOrWhiteSpace(category) ? "General" : category.Trim(),
            NormalRange = normalRange?.Trim() ?? string.Empty,
            UnitOfMeasure = unitOfMeasure?.Trim() ?? string.Empty,
            Price = price,
            Description = description?.Trim()
        };
    }

    public void Update(
        string code,
        string name,
        string category,
        string normalRange,
        string unitOfMeasure,
        decimal price,
        string? description = null)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new BusinessRuleException("Lab test code cannot be empty.");

        if (string.IsNullOrWhiteSpace(name))
            throw new BusinessRuleException("Lab test name cannot be empty.");

        if (price < 0m)
            throw new BusinessRuleException("Lab test price cannot be negative.");

        Code = code.Trim().ToUpperInvariant();
        Name = name.Trim();
        Category = string.IsNullOrWhiteSpace(category) ? "General" : category.Trim();
        NormalRange = normalRange?.Trim() ?? string.Empty;
        UnitOfMeasure = unitOfMeasure?.Trim() ?? string.Empty;
        Price = price;
        Description = description?.Trim();
    }
}

/// <summary>
/// Domain Aggregate Root for laboratory test requisitions.
/// Protects ordered test items and manages state transitions as test results are added.
/// </summary>
public class LabOrder
{
    public int Id { get; private set; }
    public int PatientId { get; private set; }
    public int DoctorId { get; private set; }
    public DateTime OrderDate { get; private set; } = DateTime.UtcNow;
    public LabPriority Priority { get; private set; } = LabPriority.Routine;
    public LabOrderStatus Status { get; private set; } = LabOrderStatus.Ordered;
    public string? ClinicalNotes { get; private set; }

    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }

    private readonly List<LabOrderItem> _items = new();
    public IReadOnlyCollection<LabOrderItem> Items => _items.AsReadOnly();

    private readonly List<LabResult> _results = new();
    public IReadOnlyCollection<LabResult> Results => _results.AsReadOnly();

    protected LabOrder() { }

    public static LabOrder Create(
        int patientId,
        int doctorId,
        LabPriority priority,
        IEnumerable<int> testIds,
        string? clinicalNotes = null,
        DateTime? orderDate = null)
    {
        if (patientId <= 0)
            throw new BusinessRuleException("Patient ID must be greater than zero.");

        if (doctorId <= 0)
            throw new BusinessRuleException("Doctor ID must be greater than zero.");

        var distinctTestIds = testIds?.Distinct().ToList() ?? new List<int>();
        if (distinctTestIds.Count == 0)
            throw new BusinessRuleException("Lab order must include at least one diagnostic lab test.");

        var order = new LabOrder
        {
            PatientId = patientId,
            DoctorId = doctorId,
            Priority = priority,
            ClinicalNotes = clinicalNotes?.Trim(),
            OrderDate = orderDate ?? DateTime.UtcNow,
            Status = LabOrderStatus.Ordered
        };

        foreach (var testId in distinctTestIds)
        {
            order._items.Add(LabOrderItem.Create(testId));
        }

        return order;
    }

    public LabResult AddResult(
        int labTestId,
        string resultValue,
        string unitOfMeasure,
        string normalRange,
        bool isAbnormal,
        string performedBy,
        string? remarks = null,
        DateTime? performedDate = null)
    {
        if (Status == LabOrderStatus.Cancelled)
            throw new BusinessRuleException("Cannot add results to a cancelled lab order.");

        if (Status == LabOrderStatus.Completed)
            throw new BusinessRuleException("Cannot add results to an already completed lab order.");

        if (!_items.Any(i => i.LabTestId == labTestId))
            throw new BusinessRuleException($"Test ID '{labTestId}' is not part of this lab requisition order.");

        var result = LabResult.Create(
            Id,
            labTestId,
            resultValue,
            unitOfMeasure,
            normalRange,
            isAbnormal,
            performedBy,
            remarks,
            performedDate);

        _results.Add(result);

        // Auto-evaluate completion invariant:
        var testsWithResults = _results.Select(r => r.LabTestId).Distinct().Count();
        if (testsWithResults >= _items.Count)
        {
            Status = LabOrderStatus.Completed;
        }
        else
        {
            Status = LabOrderStatus.InProgress;
        }

        return result;
    }

    public void Cancel()
    {
        if (Status == LabOrderStatus.Completed)
            throw new BusinessRuleException("Cannot cancel a completed lab order.");

        Status = LabOrderStatus.Cancelled;
    }
}

/// <summary>
/// Child entity of LabOrder aggregate.
/// Represents an ordered lab test investigation.
/// </summary>
public class LabOrderItem
{
    public int Id { get; private set; }
    public int LabOrderId { get; private set; }
    public int LabTestId { get; private set; }

    public LabOrder? LabOrder { get; set; }
    public LabTest? LabTest { get; set; }

    protected LabOrderItem() { }

    public static LabOrderItem Create(int labTestId)
    {
        if (labTestId <= 0)
            throw new BusinessRuleException("Lab test ID must be greater than zero.");

        return new LabOrderItem
        {
            LabTestId = labTestId
        };
    }
}

/// <summary>
/// Child entity of LabOrder aggregate.
/// Represents a recorded diagnostic laboratory finding.
/// </summary>
public class LabResult
{
    public int Id { get; private set; }
    public int LabOrderId { get; private set; }
    public int LabTestId { get; private set; }
    public string ResultValue { get; private set; } = string.Empty;
    public string UnitOfMeasure { get; private set; } = string.Empty;
    public string NormalRange { get; private set; } = string.Empty;
    public bool IsAbnormal { get; private set; }
    public DateTime PerformedDate { get; private set; } = DateTime.UtcNow;
    public string PerformedBy { get; private set; } = string.Empty;
    public string? Remarks { get; private set; }

    public LabOrder? LabOrder { get; set; }
    public LabTest? LabTest { get; set; }

    protected LabResult() { }

    public static LabResult Create(
        int labOrderId,
        int labTestId,
        string resultValue,
        string unitOfMeasure,
        string normalRange,
        bool isAbnormal,
        string performedBy,
        string? remarks = null,
        DateTime? performedDate = null)
    {
        if (string.IsNullOrWhiteSpace(resultValue))
            throw new BusinessRuleException("Lab result value cannot be empty.");

        if (string.IsNullOrWhiteSpace(performedBy))
            throw new BusinessRuleException("Performed by (technician name) cannot be empty.");

        return new LabResult
        {
            LabOrderId = labOrderId,
            LabTestId = labTestId,
            ResultValue = resultValue.Trim(),
            UnitOfMeasure = unitOfMeasure?.Trim() ?? string.Empty,
            NormalRange = normalRange?.Trim() ?? string.Empty,
            IsAbnormal = isAbnormal,
            PerformedBy = performedBy.Trim(),
            Remarks = remarks?.Trim(),
            PerformedDate = performedDate ?? DateTime.UtcNow
        };
    }
}
