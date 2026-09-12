using HospitalManagement.Core.Domain;
using HospitalManagement.Core.DTOs.Appointment;
using HospitalManagement.Core.Exceptions;
using HospitalManagement.Core.Ports.Inbound;
using HospitalManagement.Core.Ports.Outbound.Caching;
using HospitalManagement.Core.Ports.Outbound.Notifications;
using HospitalManagement.Core.Ports.Outbound.Repositories;

namespace HospitalManagement.Core.UseCases;

public class AppointmentUseCases : IAppointmentUseCases
{
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IDoctorRepository _doctorRepository;
    private readonly ICachePort _cachePort;
    private readonly INotificationPort _notificationPort;

    public AppointmentUseCases(
        IAppointmentRepository appointmentRepository,
        IPatientRepository patientRepository,
        IDoctorRepository doctorRepository,
        ICachePort cachePort,
        INotificationPort notificationPort)
    {
        _appointmentRepository = appointmentRepository;
        _patientRepository = patientRepository;
        _doctorRepository = doctorRepository;
        _cachePort = cachePort;
        _notificationPort = notificationPort;
    }

    public async Task<IEnumerable<AppointmentDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        const string cacheKey = "appointments:all";
        var cached = await _cachePort.GetAsync<IEnumerable<AppointmentDto>>(cacheKey, cancellationToken);
        if (cached != null)
        {
            return cached;
        }

        var appointments = await _appointmentRepository.GetAllAsync(cancellationToken);
        var dtos = appointments.Select(MapToDto).ToList();

        await _cachePort.SetAsync(cacheKey, dtos, TimeSpan.FromMinutes(2), cancellationToken);
        return dtos;
    }

    public async Task<AppointmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id, cancellationToken);
        if (appointment == null)
        {
            throw new NotFoundException(nameof(Appointment), id);
        }

        return MapToDto(appointment);
    }

    public async Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto, CancellationToken cancellationToken = default)
    {
        // 1. Verify Patient exists
        var patient = await _patientRepository.GetByIdAsync(dto.PatientId, cancellationToken);
        if (patient == null)
        {
            throw new NotFoundException(nameof(Patient), dto.PatientId);
        }

        // 2. Verify Doctor exists
        var doctor = await _doctorRepository.GetByIdAsync(dto.DoctorId, cancellationToken);
        if (doctor == null)
        {
            throw new NotFoundException(nameof(Doctor), dto.DoctorId);
        }

        // 3. Domain Rule: Doctor cannot have two appointments at the exact same time
        var doctorBusy = await _appointmentRepository.HasDoctorConflictAsync(dto.DoctorId, dto.AppointmentDate, null, cancellationToken);
        if (doctorBusy)
        {
            throw new ConflictException("Doctor is already booked for an appointment at this exact time.");
        }

        // 4. Domain Rule: Patient cannot have two appointments at the exact same time
        var patientBusy = await _appointmentRepository.HasPatientConflictAsync(dto.PatientId, dto.AppointmentDate, null, cancellationToken);
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

        var created = await _appointmentRepository.AddAsync(appointment, cancellationToken);
        created.Patient = patient;
        created.Doctor = doctor;

        // 5. Invalidate appointments cache via Driven Cache Port (Redis)
        await _cachePort.RemoveByPrefixAsync("appointments:", cancellationToken);

        // 6. Dispatch Email Notification via Driven Notification Port
        var notification = new AppointmentNotificationDto(
            AppointmentId: created.Id,
            PatientName: $"{patient.FirstName} {patient.LastName}",
            PatientEmail: patient.Email,
            DoctorName: $"Dr. {doctor.FirstName} {doctor.LastName}",
            DoctorSpecialization: doctor.Specialization,
            AppointmentDate: created.AppointmentDate,
            Status: created.Status.ToString(),
            Notes: created.Notes
        );

        await _notificationPort.SendAppointmentBookedAsync(notification, cancellationToken);

        return MapToDto(created);
    }

    public async Task<AppointmentDto> UpdateAsync(int id, UpdateAppointmentDto dto, CancellationToken cancellationToken = default)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id, cancellationToken);
        if (appointment == null)
        {
            throw new NotFoundException(nameof(Appointment), id);
        }

        if (appointment.AppointmentDate != dto.AppointmentDate)
        {
            var doctorBusy = await _appointmentRepository.HasDoctorConflictAsync(appointment.DoctorId, dto.AppointmentDate, id, cancellationToken);
            if (doctorBusy)
            {
                throw new ConflictException("Doctor is already booked for an appointment at the updated time.");
            }

            var patientBusy = await _appointmentRepository.HasPatientConflictAsync(appointment.PatientId, dto.AppointmentDate, id, cancellationToken);
            if (patientBusy)
            {
                throw new ConflictException("Patient already has an active appointment scheduled at the updated time.");
            }
        }

        var oldDate = appointment.AppointmentDate;
        appointment.AppointmentDate = dto.AppointmentDate;
        appointment.Status = dto.Status;
        appointment.Notes = dto.Notes;

        await _appointmentRepository.UpdateAsync(appointment, cancellationToken);

        // Invalidate cache
        await _cachePort.RemoveByPrefixAsync("appointments:", cancellationToken);

        if (oldDate != appointment.AppointmentDate && appointment.Patient != null && appointment.Doctor != null)
        {
            var notification = new AppointmentNotificationDto(
                AppointmentId: appointment.Id,
                PatientName: $"{appointment.Patient.FirstName} {appointment.Patient.LastName}",
                PatientEmail: appointment.Patient.Email,
                DoctorName: $"Dr. {appointment.Doctor.FirstName} {appointment.Doctor.LastName}",
                DoctorSpecialization: appointment.Doctor.Specialization,
                AppointmentDate: appointment.AppointmentDate,
                Status: appointment.Status.ToString(),
                Notes: appointment.Notes
            );
            await _notificationPort.SendAppointmentRescheduledAsync(notification, oldDate, cancellationToken);
        }

        return MapToDto(appointment);
    }

    public async Task<AppointmentDto> CancelAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id, cancellationToken);
        if (appointment == null)
        {
            throw new NotFoundException(nameof(Appointment), id);
        }

        if (appointment.Status == AppointmentStatus.Completed)
        {
            throw new BusinessRuleException("Cannot cancel an appointment that is already completed.");
        }

        if (appointment.Status == AppointmentStatus.Cancelled)
        {
            throw new BusinessRuleException("Appointment is already cancelled.");
        }

        appointment.Status = AppointmentStatus.Cancelled;
        await _appointmentRepository.UpdateAsync(appointment, cancellationToken);

        // Invalidate cache
        await _cachePort.RemoveByPrefixAsync("appointments:", cancellationToken);

        // Notify via Driven Email Port
        if (appointment.Patient != null && appointment.Doctor != null)
        {
            var notification = new AppointmentNotificationDto(
                AppointmentId: appointment.Id,
                PatientName: $"{appointment.Patient.FirstName} {appointment.Patient.LastName}",
                PatientEmail: appointment.Patient.Email,
                DoctorName: $"Dr. {appointment.Doctor.FirstName} {appointment.Doctor.LastName}",
                DoctorSpecialization: appointment.Doctor.Specialization,
                AppointmentDate: appointment.AppointmentDate,
                Status: appointment.Status.ToString(),
                Notes: appointment.Notes
            );
            await _notificationPort.SendAppointmentCancelledAsync(notification, cancellationToken);
        }

        return MapToDto(appointment);
    }

    public async Task<AppointmentDto> CompleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id, cancellationToken);
        if (appointment == null)
        {
            throw new NotFoundException(nameof(Appointment), id);
        }

        if (appointment.Status == AppointmentStatus.Cancelled)
        {
            throw new BusinessRuleException("Cannot complete an appointment that has been cancelled.");
        }

        appointment.Status = AppointmentStatus.Completed;
        await _appointmentRepository.UpdateAsync(appointment, cancellationToken);

        await _cachePort.RemoveByPrefixAsync("appointments:", cancellationToken);

        return MapToDto(appointment);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id, cancellationToken);
        if (appointment == null)
        {
            throw new NotFoundException(nameof(Appointment), id);
        }

        await _appointmentRepository.DeleteAsync(appointment, cancellationToken);
        await _cachePort.RemoveByPrefixAsync("appointments:", cancellationToken);
    }

    private static AppointmentDto MapToDto(Appointment a) => new()
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
    };
}
