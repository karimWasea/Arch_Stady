using HospitalManagement.Core.Domain;

namespace HospitalManagement.Core.Ports.Outbound.Repositories;

public interface IAppointmentRepository
{
    Task<IEnumerable<Appointment>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Appointment?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Appointment> AddAsync(Appointment appointment, CancellationToken cancellationToken = default);
    Task UpdateAsync(Appointment appointment, CancellationToken cancellationToken = default);
    Task DeleteAsync(Appointment appointment, CancellationToken cancellationToken = default);
    Task<bool> HasDoctorConflictAsync(int doctorId, DateTime appointmentDate, int? excludeAppointmentId = null, CancellationToken cancellationToken = default);
    Task<bool> HasPatientConflictAsync(int patientId, DateTime appointmentDate, int? excludeAppointmentId = null, CancellationToken cancellationToken = default);
}
