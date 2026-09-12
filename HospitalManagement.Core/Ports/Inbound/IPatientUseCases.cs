using HospitalManagement.Core.DTOs.Patient;

namespace HospitalManagement.Core.Ports.Inbound;

public interface IPatientUseCases
{
    Task<IEnumerable<PatientDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PatientDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<PatientDto> CreateAsync(CreatePatientDto dto, CancellationToken cancellationToken = default);
    Task<PatientDto> UpdateAsync(int id, UpdatePatientDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
