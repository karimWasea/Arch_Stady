using HospitalManagement.Application.DTOs.Pharmacy;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Entities.Pharmacy;
using HospitalManagement.Domain.Exceptions;

namespace HospitalManagement.Application.Services.Pharmacy;

/// <summary>
/// Application Service for pharmacy catalog, warehouse inventory, and medication dispensing orchestration.
/// </summary>
public class PharmacyService : IPharmacyService
{
    private readonly IMedicineRepository _medicineRepository;
    private readonly IStockRepository _stockRepository;
    private readonly IDispensingRepository _dispensingRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly ICacheService _cacheService;

    public PharmacyService(
        IMedicineRepository medicineRepository,
        IStockRepository stockRepository,
        IDispensingRepository dispensingRepository,
        IPatientRepository patientRepository,
        ICacheService cacheService)
    {
        _medicineRepository = medicineRepository;
        _stockRepository = stockRepository;
        _dispensingRepository = dispensingRepository;
        _patientRepository = patientRepository;
        _cacheService = cacheService;
    }

    public async Task<IEnumerable<MedicineDto>> GetAllMedicinesAsync(CancellationToken cancellationToken = default)
    {
        const string cacheKey = "pharmacy:medicines:all";
        var cached = await _cacheService.GetAsync<IEnumerable<MedicineDto>>(cacheKey, cancellationToken);
        if (cached != null) return cached;

        var medicines = await _medicineRepository.GetAllAsync(cancellationToken);
        var dtos = new List<MedicineDto>();

        foreach (var m in medicines)
        {
            var totalStock = await _stockRepository.GetTotalStockQuantityAsync(m.Id, cancellationToken);
            dtos.Add(new MedicineDto
            {
                Id = m.Id,
                Name = m.Name,
                GenericName = m.GenericName,
                Sku = m.Sku,
                DosageForm = m.DosageForm,
                UnitPrice = m.UnitPrice,
                Manufacturer = m.Manufacturer,
                TotalStock = totalStock,
                CreatedAt = m.CreatedAt
            });
        }

        await _cacheService.SetAsync(cacheKey, dtos, TimeSpan.FromMinutes(10), cancellationToken);
        return dtos;
    }

    public async Task<MedicineDto> GetMedicineByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var m = await _medicineRepository.GetByIdAsync(id, cancellationToken);
        if (m == null) throw new NotFoundException(nameof(Medicine), id);

        var totalStock = await _stockRepository.GetTotalStockQuantityAsync(id, cancellationToken);
        return new MedicineDto
        {
            Id = m.Id,
            Name = m.Name,
            GenericName = m.GenericName,
            Sku = m.Sku,
            DosageForm = m.DosageForm,
            UnitPrice = m.UnitPrice,
            Manufacturer = m.Manufacturer,
            TotalStock = totalStock,
            CreatedAt = m.CreatedAt
        };
    }

    public async Task<MedicineDto> CreateMedicineAsync(CreateMedicineDto dto, CancellationToken cancellationToken = default)
    {
        var existing = await _medicineRepository.GetBySkuAsync(dto.Sku, cancellationToken);
        if (existing != null) throw new ConflictException($"Medicine with SKU '{dto.Sku}' already exists.");

        // Domain Entity enforces valid name, SKU, and positive price
        var medicine = Medicine.Create(
            dto.Name,
            dto.GenericName,
            dto.Sku,
            dto.DosageForm,
            dto.UnitPrice,
            dto.Manufacturer);

        var created = await _medicineRepository.AddAsync(medicine, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("pharmacy:", cancellationToken);

        return new MedicineDto
        {
            Id = created.Id,
            Name = created.Name,
            GenericName = created.GenericName,
            Sku = created.Sku,
            DosageForm = created.DosageForm,
            UnitPrice = created.UnitPrice,
            Manufacturer = created.Manufacturer,
            TotalStock = 0,
            CreatedAt = created.CreatedAt
        };
    }

    public async Task<MedicineDto> UpdateMedicineAsync(int id, UpdateMedicineDto dto, CancellationToken cancellationToken = default)
    {
        var medicine = await _medicineRepository.GetByIdAsync(id, cancellationToken);
        if (medicine == null) throw new NotFoundException(nameof(Medicine), id);

        medicine.Update(
            dto.Name,
            dto.GenericName,
            dto.Sku,
            dto.DosageForm,
            dto.UnitPrice,
            dto.Manufacturer);

        await _medicineRepository.UpdateAsync(medicine, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("pharmacy:", cancellationToken);

        var totalStock = await _stockRepository.GetTotalStockQuantityAsync(id, cancellationToken);
        return new MedicineDto
        {
            Id = medicine.Id,
            Name = medicine.Name,
            GenericName = medicine.GenericName,
            Sku = medicine.Sku,
            DosageForm = medicine.DosageForm,
            UnitPrice = medicine.UnitPrice,
            Manufacturer = medicine.Manufacturer,
            TotalStock = totalStock,
            CreatedAt = medicine.CreatedAt
        };
    }

    public async Task DeleteMedicineAsync(int id, CancellationToken cancellationToken = default)
    {
        var medicine = await _medicineRepository.GetByIdAsync(id, cancellationToken);
        if (medicine == null) throw new NotFoundException(nameof(Medicine), id);

        await _medicineRepository.DeleteAsync(medicine, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("pharmacy:", cancellationToken);
    }

    public async Task<IEnumerable<StockDto>> GetAllStocksAsync(CancellationToken cancellationToken = default)
    {
        var stocks = await _stockRepository.GetAllAsync(cancellationToken);
        return stocks.Select(MapStockToDto).ToList();
    }

    public async Task<IEnumerable<StockDto>> GetStocksByMedicineIdAsync(int medicineId, CancellationToken cancellationToken = default)
    {
        var stocks = await _stockRepository.GetByMedicineIdAsync(medicineId, cancellationToken);
        return stocks.Select(MapStockToDto).ToList();
    }

    public async Task<StockDto> AddStockAsync(AddStockDto dto, CancellationToken cancellationToken = default)
    {
        var medicine = await _medicineRepository.GetByIdAsync(dto.MedicineId, cancellationToken);
        if (medicine == null) throw new NotFoundException(nameof(Medicine), dto.MedicineId);

        // Domain Entity enforces batch number, non-negative quantities
        var stock = Stock.Create(
            dto.MedicineId,
            dto.BatchNumber,
            dto.Quantity,
            dto.ReorderLevel,
            dto.ExpiryDate,
            dto.Location);

        var created = await _stockRepository.AddAsync(stock, cancellationToken);
        created.Medicine = medicine;
        await _cacheService.RemoveByPrefixAsync("pharmacy:", cancellationToken);

        return MapStockToDto(created);
    }

    public async Task<StockDto> UpdateStockAsync(int id, UpdateStockDto dto, CancellationToken cancellationToken = default)
    {
        var stock = await _stockRepository.GetByIdAsync(id, cancellationToken);
        if (stock == null) throw new NotFoundException(nameof(Stock), id);

        stock.UpdateDetails(dto.QuantityInStock, dto.ReorderLevel, dto.Location);

        await _stockRepository.UpdateAsync(stock, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("pharmacy:", cancellationToken);

        return MapStockToDto(stock);
    }

    public async Task<IEnumerable<DispensingOrderDto>> GetAllDispensingOrdersAsync(CancellationToken cancellationToken = default)
    {
        var orders = await _dispensingRepository.GetAllAsync(cancellationToken);
        return orders.Select(MapDispensingToDto).ToList();
    }

    public async Task<DispensingOrderDto> GetDispensingOrderByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var order = await _dispensingRepository.GetByIdAsync(id, cancellationToken);
        if (order == null) throw new NotFoundException(nameof(DispensingOrder), id);
        return MapDispensingToDto(order);
    }

    public async Task<DispensingOrderDto> DispenseOrderAsync(DispenseOrderRequestDto dto, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(dto.PatientId, cancellationToken);
        if (patient == null) throw new NotFoundException(nameof(Patient), dto.PatientId);

        var orderItems = new List<DispensingOrderItem>();

        // 1. Verify availability and create domain order line items
        foreach (var item in dto.Items)
        {
            var medicine = await _medicineRepository.GetByIdAsync(item.MedicineId, cancellationToken);
            if (medicine == null) throw new NotFoundException(nameof(Medicine), item.MedicineId);

            var availableStock = await _stockRepository.GetTotalStockQuantityAsync(item.MedicineId, cancellationToken);
            if (availableStock < item.Quantity)
            {
                throw new BusinessRuleException($"Insufficient stock for medicine '{medicine.Name}'. Requested: {item.Quantity}, Available: {availableStock}");
            }

            // Domain line item calculates subtotal
            orderItems.Add(DispensingOrderItem.Create(item.MedicineId, item.Quantity, medicine.UnitPrice));
        }

        // 2. Deduct inventory across batches via repository
        foreach (var item in dto.Items)
        {
            await _stockRepository.DeductStockQuantityAsync(item.MedicineId, item.Quantity, cancellationToken);
        }

        // 3. Create Dispensing Order Aggregate Root (calculates TotalAmount and sets status)
        var order = DispensingOrder.Create(
            dto.PatientId,
            dto.DoctorId,
            dto.PrescriptionId,
            orderItems,
            dto.Notes);

        var created = await _dispensingRepository.AddAsync(order, cancellationToken);
        created.Patient = patient;

        await _cacheService.RemoveByPrefixAsync("pharmacy:", cancellationToken);

        return MapDispensingToDto(created);
    }

    private static StockDto MapStockToDto(Stock s) => new()
    {
        Id = s.Id,
        MedicineId = s.MedicineId,
        MedicineName = s.Medicine?.Name ?? string.Empty,
        BatchNumber = s.BatchNumber,
        QuantityInStock = s.QuantityInStock,
        ReorderLevel = s.ReorderLevel,
        ExpiryDate = s.ExpiryDate,
        Location = s.Location,
        LastUpdated = s.LastUpdated
    };

    private static DispensingOrderDto MapDispensingToDto(DispensingOrder d) => new()
    {
        Id = d.Id,
        PatientId = d.PatientId,
        PatientName = d.Patient != null ? $"{d.Patient.FirstName} {d.Patient.LastName}" : string.Empty,
        DoctorId = d.DoctorId,
        DoctorName = d.Doctor != null ? $"Dr. {d.Doctor.FirstName} {d.Doctor.LastName}" : string.Empty,
        PrescriptionId = d.PrescriptionId,
        DispensedDate = d.DispensedDate,
        TotalAmount = d.TotalAmount,
        Status = d.Status,
        Notes = d.Notes,
        Items = d.Items.Select(i => new DispensingOrderItemDto
        {
            Id = i.Id,
            MedicineId = i.MedicineId,
            MedicineName = i.Medicine?.Name ?? string.Empty,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice,
            SubTotal = i.SubTotal
        }).ToList()
    };
}
