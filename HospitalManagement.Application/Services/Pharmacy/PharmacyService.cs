using HospitalManagement.Application.DTOs.Pharmacy;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Entities.Pharmacy;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;

namespace HospitalManagement.Application.Services.Pharmacy;

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

        var totalStock = await _stockRepository.GetTotalStockQuantityAsync(m.Id, cancellationToken);
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

        var medicine = new Medicine
        {
            Name = dto.Name,
            GenericName = dto.GenericName,
            Sku = dto.Sku,
            DosageForm = dto.DosageForm,
            UnitPrice = dto.UnitPrice,
            Manufacturer = dto.Manufacturer,
            CreatedAt = DateTime.UtcNow
        };

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

        medicine.Name = dto.Name;
        medicine.GenericName = dto.GenericName;
        medicine.Sku = dto.Sku;
        medicine.DosageForm = dto.DosageForm;
        medicine.UnitPrice = dto.UnitPrice;
        medicine.Manufacturer = dto.Manufacturer;

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

        var stock = new Stock
        {
            MedicineId = dto.MedicineId,
            BatchNumber = dto.BatchNumber,
            QuantityInStock = dto.Quantity,
            ReorderLevel = dto.ReorderLevel,
            ExpiryDate = dto.ExpiryDate,
            Location = dto.Location,
            LastUpdated = DateTime.UtcNow
        };

        var created = await _stockRepository.AddAsync(stock, cancellationToken);
        created.Medicine = medicine;
        await _cacheService.RemoveByPrefixAsync("pharmacy:", cancellationToken);

        return MapStockToDto(created);
    }

    public async Task<StockDto> UpdateStockAsync(int id, UpdateStockDto dto, CancellationToken cancellationToken = default)
    {
        var stock = await _stockRepository.GetByIdAsync(id, cancellationToken);
        if (stock == null) throw new NotFoundException(nameof(Stock), id);

        stock.QuantityInStock = dto.QuantityInStock;
        stock.ReorderLevel = dto.ReorderLevel;
        stock.Location = dto.Location;
        stock.LastUpdated = DateTime.UtcNow;

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
        if (dto.Items == null || !dto.Items.Any())
            throw new BusinessRuleException("Dispensing order must contain at least one item.");

        var patient = await _patientRepository.GetByIdAsync(dto.PatientId, cancellationToken);
        if (patient == null) throw new NotFoundException(nameof(Patient), dto.PatientId);

        decimal totalAmount = 0m;
        var orderItems = new List<DispensingOrderItem>();

        // 1. Verify availability and calculate costs
        foreach (var item in dto.Items)
        {
            var medicine = await _medicineRepository.GetByIdAsync(item.MedicineId, cancellationToken);
            if (medicine == null) throw new NotFoundException(nameof(Medicine), item.MedicineId);

            var availableStock = await _stockRepository.GetTotalStockQuantityAsync(item.MedicineId, cancellationToken);
            if (availableStock < item.Quantity)
            {
                throw new BusinessRuleException($"Insufficient stock for medicine '{medicine.Name}'. Requested: {item.Quantity}, Available: {availableStock}");
            }

            var subTotal = medicine.UnitPrice * item.Quantity;
            totalAmount += subTotal;

            orderItems.Add(new DispensingOrderItem
            {
                MedicineId = item.MedicineId,
                Medicine = medicine,
                Quantity = item.Quantity,
                UnitPrice = medicine.UnitPrice,
                SubTotal = subTotal
            });
        }

        // 2. Deduct inventory across stocks
        foreach (var item in dto.Items)
        {
            await _stockRepository.DeductStockQuantityAsync(item.MedicineId, item.Quantity, cancellationToken);
        }

        // 3. Create Dispensing Order
        var order = new DispensingOrder
        {
            PatientId = dto.PatientId,
            DoctorId = dto.DoctorId,
            PrescriptionId = dto.PrescriptionId,
            DispensedDate = DateTime.UtcNow,
            TotalAmount = totalAmount,
            Status = DispensingStatus.Dispensed,
            Notes = dto.Notes,
            Items = orderItems
        };

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
