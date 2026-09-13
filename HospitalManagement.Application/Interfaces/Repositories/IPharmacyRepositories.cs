using HospitalManagement.Domain.Entities.Pharmacy;

namespace HospitalManagement.Application.Interfaces.Repositories;

public interface IMedicineRepository
{
    Task<IEnumerable<Medicine>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Medicine?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Medicine?> GetBySkuAsync(string sku, CancellationToken cancellationToken = default);
    Task<Medicine> AddAsync(Medicine medicine, CancellationToken cancellationToken = default);
    Task UpdateAsync(Medicine medicine, CancellationToken cancellationToken = default);
    Task DeleteAsync(Medicine medicine, CancellationToken cancellationToken = default);
}

public interface IStockRepository
{
    Task<IEnumerable<Stock>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Stock>> GetByMedicineIdAsync(int medicineId, CancellationToken cancellationToken = default);
    Task<Stock?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Stock> AddAsync(Stock stock, CancellationToken cancellationToken = default);
    Task UpdateAsync(Stock stock, CancellationToken cancellationToken = default);
    Task<int> GetTotalStockQuantityAsync(int medicineId, CancellationToken cancellationToken = default);
    Task DeductStockQuantityAsync(int medicineId, int quantity, CancellationToken cancellationToken = default);
}

public interface IDispensingRepository
{
    Task<IEnumerable<DispensingOrder>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<DispensingOrder?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<DispensingOrder>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<DispensingOrder> AddAsync(DispensingOrder order, CancellationToken cancellationToken = default);
    Task UpdateAsync(DispensingOrder order, CancellationToken cancellationToken = default);
}
