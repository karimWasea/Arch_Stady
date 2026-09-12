using HospitalManagement.Core.DTOs.MedicalRecord;

namespace HospitalManagement.Core.Ports.Inbound;

public interface IMedicalRecordUseCases
{
    Task<IEnumerable<MedicalRecordDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<MedicalRecordDto>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<MedicalRecordDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<MedicalRecordDto> CreateAsync(CreateMedicalRecordDto dto, CancellationToken cancellationToken = default);
    Task<MedicalRecordDto> UpdateAsync(int id, UpdateMedicalRecordDto dto, CancellationToken cancellationToken = default);
}
