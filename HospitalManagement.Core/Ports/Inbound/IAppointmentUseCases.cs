using HospitalManagement.Core.DTOs.Appointment;

namespace HospitalManagement.Core.Ports.Inbound;

public interface IAppointmentUseCases
{
    Task<IEnumerable<AppointmentDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<AppointmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto, CancellationToken cancellationToken = default);
    Task<AppointmentDto> UpdateAsync(int id, UpdateAppointmentDto dto, CancellationToken cancellationToken = default);
    Task<AppointmentDto> CancelAsync(int id, CancellationToken cancellationToken = default);
    Task<AppointmentDto> CompleteAsync(int id, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
