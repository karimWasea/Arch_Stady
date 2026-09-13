using HospitalManagement.Application.DTOs.Laboratory;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Notifications;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Entities.Laboratory;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;

namespace HospitalManagement.Application.Services.Laboratory;

public class LaboratoryService : ILaboratoryService
{
    private readonly ILabTestRepository _labTestRepository;
    private readonly ILabOrderRepository _labOrderRepository;
    private readonly ILabResultRepository _labResultRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IDoctorRepository _doctorRepository;
    private readonly ICacheService _cacheService;
    private readonly IEmailService _emailService;

    public LaboratoryService(
        ILabTestRepository labTestRepository,
        ILabOrderRepository labOrderRepository,
        ILabResultRepository labResultRepository,
        IPatientRepository patientRepository,
        IDoctorRepository doctorRepository,
        ICacheService cacheService,
        IEmailService emailService)
    {
        _labTestRepository = labTestRepository;
        _labOrderRepository = labOrderRepository;
        _labResultRepository = labResultRepository;
        _patientRepository = patientRepository;
        _doctorRepository = doctorRepository;
        _cacheService = cacheService;
        _emailService = emailService;
    }

    public async Task<IEnumerable<LabTestDto>> GetAllLabTestsAsync(CancellationToken cancellationToken = default)
    {
        const string cacheKey = "lab:tests:all";
        var cached = await _cacheService.GetAsync<IEnumerable<LabTestDto>>(cacheKey, cancellationToken);
        if (cached != null) return cached;

        var tests = await _labTestRepository.GetAllAsync(cancellationToken);
        var dtos = tests.Select(MapTestToDto).ToList();
        await _cacheService.SetAsync(cacheKey, dtos, TimeSpan.FromMinutes(15), cancellationToken);
        return dtos;
    }

    public async Task<LabTestDto> GetLabTestByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var test = await _labTestRepository.GetByIdAsync(id, cancellationToken);
        if (test == null) throw new NotFoundException(nameof(LabTest), id);
        return MapTestToDto(test);
    }

    public async Task<LabTestDto> CreateLabTestAsync(CreateLabTestDto dto, CancellationToken cancellationToken = default)
    {
        var existing = await _labTestRepository.GetByCodeAsync(dto.Code, cancellationToken);
        if (existing != null) throw new ConflictException($"Lab test with code '{dto.Code}' already exists.");

        var test = new LabTest
        {
            Code = dto.Code.Trim().ToUpper(),
            Name = dto.Name,
            Category = dto.Category,
            NormalRange = dto.NormalRange,
            UnitOfMeasure = dto.UnitOfMeasure,
            Price = dto.Price,
            Description = dto.Description
        };

        var created = await _labTestRepository.AddAsync(test, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("lab:", cancellationToken);
        return MapTestToDto(created);
    }

    public async Task<LabTestDto> UpdateLabTestAsync(int id, UpdateLabTestDto dto, CancellationToken cancellationToken = default)
    {
        var test = await _labTestRepository.GetByIdAsync(id, cancellationToken);
        if (test == null) throw new NotFoundException(nameof(LabTest), id);

        test.Code = dto.Code.Trim().ToUpper();
        test.Name = dto.Name;
        test.Category = dto.Category;
        test.NormalRange = dto.NormalRange;
        test.UnitOfMeasure = dto.UnitOfMeasure;
        test.Price = dto.Price;
        test.Description = dto.Description;

        await _labTestRepository.UpdateAsync(test, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("lab:", cancellationToken);
        return MapTestToDto(test);
    }

    public async Task DeleteLabTestAsync(int id, CancellationToken cancellationToken = default)
    {
        var test = await _labTestRepository.GetByIdAsync(id, cancellationToken);
        if (test == null) throw new NotFoundException(nameof(LabTest), id);

        await _labTestRepository.DeleteAsync(test, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("lab:", cancellationToken);
    }

    public async Task<IEnumerable<LabOrderDto>> GetAllLabOrdersAsync(CancellationToken cancellationToken = default)
    {
        var orders = await _labOrderRepository.GetAllAsync(cancellationToken);
        return orders.Select(MapOrderToDto).ToList();
    }

    public async Task<LabOrderDto> GetLabOrderByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var order = await _labOrderRepository.GetByIdAsync(id, cancellationToken);
        if (order == null) throw new NotFoundException(nameof(LabOrder), id);
        return MapOrderToDto(order);
    }

    public async Task<IEnumerable<LabOrderDto>> GetLabOrdersByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        if (!await _patientRepository.ExistsAsync(patientId, cancellationToken))
            throw new NotFoundException(nameof(Patient), patientId);

        var orders = await _labOrderRepository.GetByPatientIdAsync(patientId, cancellationToken);
        return orders.Select(MapOrderToDto).ToList();
    }

    public async Task<LabOrderDto> CreateLabOrderAsync(CreateLabOrderDto dto, CancellationToken cancellationToken = default)
    {
        if (dto.TestIds == null || !dto.TestIds.Any())
            throw new BusinessRuleException("Lab order must include at least one lab test.");

        var patient = await _patientRepository.GetByIdAsync(dto.PatientId, cancellationToken);
        if (patient == null) throw new NotFoundException(nameof(Patient), dto.PatientId);

        var doctor = await _doctorRepository.GetByIdAsync(dto.DoctorId, cancellationToken);
        if (doctor == null) throw new NotFoundException(nameof(Doctor), dto.DoctorId);

        var orderItems = new List<LabOrderItem>();
        foreach (var testId in dto.TestIds)
        {
            var test = await _labTestRepository.GetByIdAsync(testId, cancellationToken);
            if (test == null) throw new NotFoundException(nameof(LabTest), testId);

            orderItems.Add(new LabOrderItem
            {
                LabTestId = testId,
                LabTest = test
            });
        }

        var order = new LabOrder
        {
            PatientId = dto.PatientId,
            DoctorId = dto.DoctorId,
            OrderDate = DateTime.UtcNow,
            Priority = dto.Priority,
            Status = LabOrderStatus.Ordered,
            ClinicalNotes = dto.ClinicalNotes,
            Items = orderItems
        };

        var created = await _labOrderRepository.AddAsync(order, cancellationToken);
        created.Patient = patient;
        created.Doctor = doctor;

        return MapOrderToDto(created);
    }

    public async Task<IEnumerable<LabResultDto>> GetLabResultsByOrderIdAsync(int orderId, CancellationToken cancellationToken = default)
    {
        var results = await _labResultRepository.GetByOrderIdAsync(orderId, cancellationToken);
        return results.Select(MapResultToDto).ToList();
    }

    public async Task<LabResultDto> RecordLabResultAsync(RecordLabResultDto dto, CancellationToken cancellationToken = default)
    {
        var order = await _labOrderRepository.GetByIdAsync(dto.LabOrderId, cancellationToken);
        if (order == null) throw new NotFoundException(nameof(LabOrder), dto.LabOrderId);

        var test = await _labTestRepository.GetByIdAsync(dto.LabTestId, cancellationToken);
        if (test == null) throw new NotFoundException(nameof(LabTest), dto.LabTestId);

        var result = new LabResult
        {
            LabOrderId = dto.LabOrderId,
            LabTestId = dto.LabTestId,
            ResultValue = dto.ResultValue,
            UnitOfMeasure = test.UnitOfMeasure,
            NormalRange = test.NormalRange,
            IsAbnormal = dto.IsAbnormal,
            PerformedDate = DateTime.UtcNow,
            PerformedBy = dto.PerformedBy,
            Remarks = dto.Remarks
        };

        var created = await _labResultRepository.AddAsync(result, cancellationToken);
        created.LabTest = test;

        // Check if order is fully completed
        var existingResults = await _labResultRepository.GetByOrderIdAsync(dto.LabOrderId, cancellationToken);
        if (existingResults.Count() >= order.Items.Count)
        {
            order.Status = LabOrderStatus.Completed;
            await _labOrderRepository.UpdateAsync(order, cancellationToken);
        }
        else
        {
            order.Status = LabOrderStatus.InProgress;
            await _labOrderRepository.UpdateAsync(order, cancellationToken);
        }

        // Notify patient if result is available
        if (order.Patient != null)
        {
            await _emailService.SendLabResultReadyAsync(new LabResultNotificationDto(
                LabOrderId: order.Id,
                PatientName: $"{order.Patient.FirstName} {order.Patient.LastName}",
                PatientEmail: order.Patient.Email,
                TestName: test.Name,
                ResultValue: result.ResultValue,
                IsAbnormal: result.IsAbnormal,
                PerformedDate: result.PerformedDate
            ), cancellationToken);
        }

        return MapResultToDto(created);
    }

    private static LabTestDto MapTestToDto(LabTest t) => new()
    {
        Id = t.Id,
        Code = t.Code,
        Name = t.Name,
        Category = t.Category,
        NormalRange = t.NormalRange,
        UnitOfMeasure = t.UnitOfMeasure,
        Price = t.Price,
        Description = t.Description
    };

    private static LabOrderDto MapOrderToDto(LabOrder o) => new()
    {
        Id = o.Id,
        PatientId = o.PatientId,
        PatientName = o.Patient != null ? $"{o.Patient.FirstName} {o.Patient.LastName}" : string.Empty,
        DoctorId = o.DoctorId,
        DoctorName = o.Doctor != null ? $"Dr. {o.Doctor.FirstName} {o.Doctor.LastName}" : string.Empty,
        OrderDate = o.OrderDate,
        Priority = o.Priority,
        Status = o.Status,
        ClinicalNotes = o.ClinicalNotes,
        Items = o.Items.Select(i => new LabOrderItemDto
        {
            Id = i.Id,
            LabTestId = i.LabTestId,
            TestCode = i.LabTest?.Code ?? string.Empty,
            TestName = i.LabTest?.Name ?? string.Empty,
            Price = i.LabTest?.Price ?? 0m
        }).ToList(),
        Results = o.Results.Select(MapResultToDto).ToList()
    };

    private static LabResultDto MapResultToDto(LabResult r) => new()
    {
        Id = r.Id,
        LabOrderId = r.LabOrderId,
        LabTestId = r.LabTestId,
        TestName = r.LabTest?.Name ?? string.Empty,
        ResultValue = r.ResultValue,
        UnitOfMeasure = r.UnitOfMeasure,
        NormalRange = r.NormalRange,
        IsAbnormal = r.IsAbnormal,
        PerformedDate = r.PerformedDate,
        PerformedBy = r.PerformedBy,
        Remarks = r.Remarks
    };
}
