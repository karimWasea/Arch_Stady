using HospitalManagement.Core.DTOs.Prescription;

namespace HospitalManagement.Core.Ports.Inbound;

public interface IPrescriptionUseCases
{
    Task<IEnumerable<PrescriptionDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<PrescriptionDto>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<PrescriptionDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<PrescriptionDto> CreateAsync(CreatePrescriptionDto dto, CancellationToken cancellationToken = default);
    Task<PrescriptionDto> UpdateAsync(int id, UpdatePrescriptionDto dto, CancellationToken cancellationToken = default);
}
