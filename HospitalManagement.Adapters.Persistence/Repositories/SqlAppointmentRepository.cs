using HospitalManagement.Adapters.Persistence.Context;
using HospitalManagement.Core.Domain;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Adapters.Persistence.Repositories;

public class SqlAppointmentRepository : IAppointmentRepository
{
    private readonly ApplicationDbContext _context;

    public SqlAppointmentRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Appointment>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Appointments
            .AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .ToListAsync(cancellationToken);
    }

    public async Task<Appointment?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
    }

    public async Task<Appointment> AddAsync(Appointment appointment, CancellationToken cancellationToken = default)
    {
        await _context.Appointments.AddAsync(appointment, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return appointment;
    }

    public async Task UpdateAsync(Appointment appointment, CancellationToken cancellationToken = default)
    {
        _context.Appointments.Update(appointment);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Appointment appointment, CancellationToken cancellationToken = default)
    {
        _context.Appointments.Remove(appointment);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> HasDoctorConflictAsync(int doctorId, DateTime appointmentDate, int? excludeAppointmentId = null, CancellationToken cancellationToken = default)
    {
        return await _context.Appointments.AnyAsync(a =>
            (!excludeAppointmentId.HasValue || a.Id != excludeAppointmentId.Value) &&
            a.DoctorId == doctorId &&
            a.AppointmentDate == appointmentDate &&
            a.Status != AppointmentStatus.Cancelled, cancellationToken);
    }

    public async Task<bool> HasPatientConflictAsync(int patientId, DateTime appointmentDate, int? excludeAppointmentId = null, CancellationToken cancellationToken = default)
    {
        return await _context.Appointments.AnyAsync(a =>
            (!excludeAppointmentId.HasValue || a.Id != excludeAppointmentId.Value) &&
            a.PatientId == patientId &&
            a.AppointmentDate == appointmentDate &&
            a.Status != AppointmentStatus.Cancelled, cancellationToken);
    }
}
