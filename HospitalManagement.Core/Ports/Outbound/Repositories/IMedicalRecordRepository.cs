using HospitalManagement.Core.Domain;

namespace HospitalManagement.Core.Ports.Outbound.Repositories;

public interface IMedicalRecordRepository
{
    Task<IEnumerable<MedicalRecord>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<MedicalRecord>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<MedicalRecord?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<MedicalRecord> AddAsync(MedicalRecord record, CancellationToken cancellationToken = default);
    Task UpdateAsync(MedicalRecord record, CancellationToken cancellationToken = default);
}
