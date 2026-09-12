using HospitalManagement.Core.Domain;

namespace HospitalManagement.Core.Ports.Outbound.Repositories;

public interface IPrescriptionRepository
{
    Task<IEnumerable<Prescription>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Prescription>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<Prescription?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Prescription> AddAsync(Prescription prescription, CancellationToken cancellationToken = default);
    Task UpdateAsync(Prescription prescription, CancellationToken cancellationToken = default);
}
