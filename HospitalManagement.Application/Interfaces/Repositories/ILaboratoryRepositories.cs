using HospitalManagement.Domain.Entities.Laboratory;

namespace HospitalManagement.Application.Interfaces.Repositories;

public interface ILabTestRepository
{
    Task<IEnumerable<LabTest>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<LabTest?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<LabTest?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<LabTest> AddAsync(LabTest test, CancellationToken cancellationToken = default);
    Task UpdateAsync(LabTest test, CancellationToken cancellationToken = default);
    Task DeleteAsync(LabTest test, CancellationToken cancellationToken = default);
}

public interface ILabOrderRepository
{
    Task<IEnumerable<LabOrder>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<LabOrder?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<LabOrder>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<LabOrder> AddAsync(LabOrder order, CancellationToken cancellationToken = default);
    Task UpdateAsync(LabOrder order, CancellationToken cancellationToken = default);
}

public interface ILabResultRepository
{
    Task<IEnumerable<LabResult>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<LabResult>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default);
    Task<LabResult?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<LabResult> AddAsync(LabResult result, CancellationToken cancellationToken = default);
    Task UpdateAsync(LabResult result, CancellationToken cancellationToken = default);
}
