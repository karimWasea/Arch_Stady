using HospitalManagement.Application.DTOs.Pharmacy;

namespace HospitalManagement.Application.Services.Pharmacy;

public interface IPharmacyService
{
    Task<IEnumerable<MedicineDto>> GetAllMedicinesAsync(CancellationToken cancellationToken = default);
    Task<MedicineDto> GetMedicineByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<MedicineDto> CreateMedicineAsync(CreateMedicineDto dto, CancellationToken cancellationToken = default);
    Task<MedicineDto> UpdateMedicineAsync(int id, UpdateMedicineDto dto, CancellationToken cancellationToken = default);
    Task DeleteMedicineAsync(int id, CancellationToken cancellationToken = default);

    Task<IEnumerable<StockDto>> GetAllStocksAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<StockDto>> GetStocksByMedicineIdAsync(int medicineId, CancellationToken cancellationToken = default);
    Task<StockDto> AddStockAsync(AddStockDto dto, CancellationToken cancellationToken = default);
    Task<StockDto> UpdateStockAsync(int id, UpdateStockDto dto, CancellationToken cancellationToken = default);

    Task<IEnumerable<DispensingOrderDto>> GetAllDispensingOrdersAsync(CancellationToken cancellationToken = default);
    Task<DispensingOrderDto> GetDispensingOrderByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DispensingOrderDto> DispenseOrderAsync(DispenseOrderRequestDto dto, CancellationToken cancellationToken = default);
}
