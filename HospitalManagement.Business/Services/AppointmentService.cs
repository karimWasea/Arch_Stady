using HospitalManagement.Business.DTOs.Appointment;
using HospitalManagement.Business.Exceptions;
using HospitalManagement.Business.Interfaces;
using HospitalManagement.DataAccess.Context;
using HospitalManagement.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Business.Services;

public class AppointmentService : IAppointmentService
{
    private readonly ApplicationDbContext _context;

    public AppointmentService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AppointmentDto>> GetAllAsync()
    {
        return await _context.Appointments
            .AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .Select(a => new AppointmentDto
            {
                Id = a.Id,
                PatientId = a.PatientId,
                PatientName = a.Patient != null ? $"{a.Patient.FirstName} {a.Patient.LastName}" : string.Empty,
                DoctorId = a.DoctorId,
                DoctorName = a.Doctor != null ? $"Dr. {a.Doctor.FirstName} {a.Doctor.LastName}" : string.Empty,
                AppointmentDate = a.AppointmentDate,
                Status = a.Status,
                Notes = a.Notes,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<AppointmentDto> GetByIdAsync(int id)
    {
        var appointment = await _context.Appointments
            .AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            throw new NotFoundException(nameof(Appointment), id);
        }

        return new AppointmentDto
        {
            Id = appointment.Id,
            PatientId = appointment.PatientId,
            PatientName = appointment.Patient != null ? $"{appointment.Patient.FirstName} {appointment.Patient.LastName}" : string.Empty,
            DoctorId = appointment.DoctorId,
            DoctorName = appointment.Doctor != null ? $"Dr. {appointment.Doctor.FirstName} {appointment.Doctor.LastName}" : string.Empty,
            AppointmentDate = appointment.AppointmentDate,
            Status = appointment.Status,
            Notes = appointment.Notes,
            CreatedAt = appointment.CreatedAt
        };
    }

    public async Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto)
    {
        // 1. Verify Patient exists
        var patientExists = await _context.Patients.AnyAsync(p => p.Id == dto.PatientId);
        if (!patientExists)
        {
            throw new NotFoundException(nameof(Patient), dto.PatientId);
        }

        // 2. Verify Doctor exists
        var doctorExists = await _context.Doctors.AnyAsync(d => d.Id == dto.DoctorId);
        if (!doctorExists)
        {
            throw new NotFoundException(nameof(Doctor), dto.DoctorId);
        }

        // 3. Business Rule: Doctor cannot have two appointments at the exact same time
        var doctorBusy = await _context.Appointments.AnyAsync(a =>
            a.DoctorId == dto.DoctorId &&
            a.AppointmentDate == dto.AppointmentDate &&
            a.Status != AppointmentStatus.Cancelled);

        if (doctorBusy)
        {
            throw new ConflictException("Doctor is already booked for an appointment at this exact time.");
        }

        // 4. Business Rule: Patient cannot have two appointments at the exact same time
        var patientBusy = await _context.Appointments.AnyAsync(a =>
            a.PatientId == dto.PatientId &&
            a.AppointmentDate == dto.AppointmentDate &&
            a.Status != AppointmentStatus.Cancelled);

        if (patientBusy)
        {
            throw new ConflictException("Patient already has an active appointment scheduled at this exact time.");
        }

        var appointment = new Appointment
        {
            PatientId = dto.PatientId,
            DoctorId = dto.DoctorId,
            AppointmentDate = dto.AppointmentDate,
            Status = AppointmentStatus.Scheduled,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        var patient = await _context.Patients.FindAsync(dto.PatientId);
        var doctor = await _context.Doctors.FindAsync(dto.DoctorId);

        return new AppointmentDto
        {
            Id = appointment.Id,
            PatientId = appointment.PatientId,
            PatientName = patient != null ? $"{patient.FirstName} {patient.LastName}" : string.Empty,
            DoctorId = appointment.DoctorId,
            DoctorName = doctor != null ? $"Dr. {doctor.FirstName} {doctor.LastName}" : string.Empty,
            AppointmentDate = appointment.AppointmentDate,
            Status = appointment.Status,
            Notes = appointment.Notes,
            CreatedAt = appointment.CreatedAt
        };
    }

    public async Task<AppointmentDto> UpdateAsync(int id, UpdateAppointmentDto dto)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            throw new NotFoundException(nameof(Appointment), id);
        }

        // If changing time, check conflict
        if (appointment.AppointmentDate != dto.AppointmentDate)
        {
            var doctorBusy = await _context.Appointments.AnyAsync(a =>
                a.Id != id &&
                a.DoctorId == appointment.DoctorId &&
                a.AppointmentDate == dto.AppointmentDate &&
                a.Status != AppointmentStatus.Cancelled);

            if (doctorBusy)
            {
                throw new ConflictException("Doctor is already booked for an appointment at the updated time.");
            }

            var patientBusy = await _context.Appointments.AnyAsync(a =>
                a.Id != id &&
                a.PatientId == appointment.PatientId &&
                a.AppointmentDate == dto.AppointmentDate &&
                a.Status != AppointmentStatus.Cancelled);

            if (patientBusy)
            {
                throw new ConflictException("Patient already has an active appointment scheduled at the updated time.");
            }
        }

        appointment.AppointmentDate = dto.AppointmentDate;
        appointment.Status = dto.Status;
        appointment.Notes = dto.Notes;

        await _context.SaveChangesAsync();

        return new AppointmentDto
        {
            Id = appointment.Id,
            PatientId = appointment.PatientId,
            PatientName = appointment.Patient != null ? $"{appointment.Patient.FirstName} {appointment.Patient.LastName}" : string.Empty,
            DoctorId = appointment.DoctorId,
            DoctorName = appointment.Doctor != null ? $"Dr. {appointment.Doctor.FirstName} {appointment.Doctor.LastName}" : string.Empty,
            AppointmentDate = appointment.AppointmentDate,
            Status = appointment.Status,
            Notes = appointment.Notes,
            CreatedAt = appointment.CreatedAt
        };
    }

    public async Task<AppointmentDto> CompleteAsync(int id)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            throw new NotFoundException(nameof(Appointment), id);
        }

        // Business Rule: Cancelled appointments cannot be marked as completed
        if (appointment.Status == AppointmentStatus.Cancelled)
        {
            throw new BusinessRuleException("Cancelled appointments cannot be marked as completed.");
        }

        // Business Rule: Only Scheduled appointments can be completed
        if (appointment.Status != AppointmentStatus.Scheduled)
        {
            throw new BusinessRuleException($"Only Scheduled appointments can be completed. Current status is '{appointment.Status}'.");
        }

        appointment.Status = AppointmentStatus.Completed;
        await _context.SaveChangesAsync();

        return new AppointmentDto
        {
            Id = appointment.Id,
            PatientId = appointment.PatientId,
            PatientName = appointment.Patient != null ? $"{appointment.Patient.FirstName} {appointment.Patient.LastName}" : string.Empty,
            DoctorId = appointment.DoctorId,
            DoctorName = appointment.Doctor != null ? $"Dr. {appointment.Doctor.FirstName} {appointment.Doctor.LastName}" : string.Empty,
            AppointmentDate = appointment.AppointmentDate,
            Status = appointment.Status,
            Notes = appointment.Notes,
            CreatedAt = appointment.CreatedAt
        };
    }

    public async Task<AppointmentDto> CancelAsync(int id)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            throw new NotFoundException(nameof(Appointment), id);
        }

        appointment.Status = AppointmentStatus.Cancelled;
        await _context.SaveChangesAsync();

        return new AppointmentDto
        {
            Id = appointment.Id,
            PatientId = appointment.PatientId,
            PatientName = appointment.Patient != null ? $"{appointment.Patient.FirstName} {appointment.Patient.LastName}" : string.Empty,
            DoctorId = appointment.DoctorId,
            DoctorName = appointment.Doctor != null ? $"Dr. {appointment.Doctor.FirstName} {appointment.Doctor.LastName}" : string.Empty,
            AppointmentDate = appointment.AppointmentDate,
            Status = appointment.Status,
            Notes = appointment.Notes,
            CreatedAt = appointment.CreatedAt
        };
    }

    public async Task DeleteAsync(int id)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            throw new NotFoundException(nameof(Appointment), id);
        }

        _context.Appointments.Remove(appointment);
        await _context.SaveChangesAsync();
    }
}
