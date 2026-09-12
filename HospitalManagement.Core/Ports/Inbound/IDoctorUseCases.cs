using HospitalManagement.Core.DTOs.Doctor;

namespace HospitalManagement.Core.Ports.Inbound;

public interface IDoctorUseCases
{
    Task<IEnumerable<DoctorDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<DoctorDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DoctorDto> CreateAsync(CreateDoctorDto dto, CancellationToken cancellationToken = default);
    Task<DoctorDto> UpdateAsync(int id, UpdateDoctorDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
