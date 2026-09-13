using HospitalManagement.Application.DTOs.Auth;
using HospitalManagement.Application.DTOs.Clinical;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Notifications;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Application.Security;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;
using Microsoft.Extensions.Configuration;

namespace HospitalManagement.Application.Services.Clinical;

// ==============================================================================
// 1. APPOINTMENT SERVICE
// ==============================================================================
public class AppointmentService : IAppointmentService
{
    private readonly IAppointmentRepository _appointmentRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IDoctorRepository _doctorRepository;
    private readonly ICacheService _cacheService;
    private readonly IEmailService _emailService;

    public AppointmentService(
        IAppointmentRepository appointmentRepository,
        IPatientRepository patientRepository,
        IDoctorRepository doctorRepository,
        ICacheService cacheService,
        IEmailService emailService)
    {
        _appointmentRepository = appointmentRepository;
        _patientRepository = patientRepository;
        _doctorRepository = doctorRepository;
        _cacheService = cacheService;
        _emailService = emailService;
    }

    public async Task<IEnumerable<AppointmentDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        const string cacheKey = "appointments:all";
        var cached = await _cacheService.GetAsync<IEnumerable<AppointmentDto>>(cacheKey, cancellationToken);
        if (cached != null) return cached;

        var appointments = await _appointmentRepository.GetAllAsync(cancellationToken);
        var dtos = appointments.Select(MapToDto).ToList();
        await _cacheService.SetAsync(cacheKey, dtos, TimeSpan.FromMinutes(2), cancellationToken);
        return dtos;
    }

    public async Task<AppointmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id, cancellationToken);
        if (appointment == null) throw new NotFoundException(nameof(Appointment), id);
        return MapToDto(appointment);
    }

    public async Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(dto.PatientId, cancellationToken);
        if (patient == null) throw new NotFoundException(nameof(Patient), dto.PatientId);

        var doctor = await _doctorRepository.GetByIdAsync(dto.DoctorId, cancellationToken);
        if (doctor == null) throw new NotFoundException(nameof(Doctor), dto.DoctorId);

        if (await _appointmentRepository.HasDoctorConflictAsync(dto.DoctorId, dto.AppointmentDate, null, cancellationToken))
            throw new ConflictException("Doctor is already booked for an appointment at this exact time.");

        if (await _appointmentRepository.HasPatientConflictAsync(dto.PatientId, dto.AppointmentDate, null, cancellationToken))
            throw new ConflictException("Patient already has an active appointment scheduled at this exact time.");

        // Domain Aggregate Root enforces scheduling validation (future date, positive IDs)
        var appointment = Appointment.Create(
            dto.PatientId,
            dto.DoctorId,
            dto.AppointmentDate,
            dto.Notes);

        var created = await _appointmentRepository.AddAsync(appointment, cancellationToken);
        created.Patient = patient;
        created.Doctor = doctor;

        await _cacheService.RemoveByPrefixAsync("appointments:", cancellationToken);

        await _emailService.SendAppointmentBookedAsync(new AppointmentNotificationDto(
            AppointmentId: created.Id,
            PatientName: $"{patient.FirstName} {patient.LastName}",
            PatientEmail: patient.Email,
            DoctorName: $"Dr. {doctor.FirstName} {doctor.LastName}",
            DoctorSpecialization: doctor.Specialization,
            AppointmentDate: created.AppointmentDate,
            Status: created.Status.ToString(),
            Notes: created.Notes
        ), cancellationToken);

        return MapToDto(created);
    }

    public async Task<AppointmentDto> UpdateAsync(int id, UpdateAppointmentDto dto, CancellationToken cancellationToken = default)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id, cancellationToken);
        if (appointment == null) throw new NotFoundException(nameof(Appointment), id);

        if (appointment.AppointmentDate != dto.AppointmentDate)
        {
            if (await _appointmentRepository.HasDoctorConflictAsync(appointment.DoctorId, dto.AppointmentDate, id, cancellationToken))
                throw new ConflictException("Doctor is already booked for an appointment at the updated time.");

            if (await _appointmentRepository.HasPatientConflictAsync(appointment.PatientId, dto.AppointmentDate, id, cancellationToken))
                throw new ConflictException("Patient already has an active appointment scheduled at the updated time.");

            // Domain method enforces reschedule rules
            appointment.Reschedule(dto.AppointmentDate, dto.Notes);
        }

        await _appointmentRepository.UpdateAsync(appointment, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("appointments:", cancellationToken);
        return MapToDto(appointment);
    }

    public async Task<AppointmentDto> CancelAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id, cancellationToken);
        if (appointment == null) throw new NotFoundException(nameof(Appointment), id);

        // Domain Aggregate Root enforces cancellation state transition invariants
        appointment.Cancel();

        await _appointmentRepository.UpdateAsync(appointment, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("appointments:", cancellationToken);

        if (appointment.Patient != null && appointment.Doctor != null)
        {
            await _emailService.SendAppointmentCancelledAsync(new AppointmentNotificationDto(
                AppointmentId: appointment.Id,
                PatientName: $"{appointment.Patient.FirstName} {appointment.Patient.LastName}",
                PatientEmail: appointment.Patient.Email,
                DoctorName: $"Dr. {appointment.Doctor.FirstName} {appointment.Doctor.LastName}",
                DoctorSpecialization: appointment.Doctor.Specialization,
                AppointmentDate: appointment.AppointmentDate,
                Status: appointment.Status.ToString(),
                Notes: appointment.Notes
            ), cancellationToken);
        }

        return MapToDto(appointment);
    }

    public async Task<AppointmentDto> CompleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id, cancellationToken);
        if (appointment == null) throw new NotFoundException(nameof(Appointment), id);

        // Domain Aggregate Root enforces completion state transition invariants
        appointment.Complete();

        await _appointmentRepository.UpdateAsync(appointment, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("appointments:", cancellationToken);
        return MapToDto(appointment);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id, cancellationToken);
        if (appointment == null) throw new NotFoundException(nameof(Appointment), id);

        await _appointmentRepository.DeleteAsync(appointment, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("appointments:", cancellationToken);
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

// ==============================================================================
// 2. PATIENT SERVICE
// ==============================================================================
public class PatientService : IPatientService
{
    private readonly IPatientRepository _patientRepository;

    public PatientService(IPatientRepository patientRepository)
    {
        _patientRepository = patientRepository;
    }

    public async Task<IEnumerable<PatientDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var patients = await _patientRepository.GetAllAsync(cancellationToken);
        return patients.Select(MapPatientToDto).ToList();
    }

    public async Task<PatientDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var p = await _patientRepository.GetByIdAsync(id, cancellationToken);
        if (p == null) throw new NotFoundException(nameof(Patient), id);
        return MapPatientToDto(p);
    }

    public async Task<PatientDto> CreateAsync(CreatePatientDto dto, CancellationToken cancellationToken = default)
    {
        // Domain Entity enforces valid demographics and birth date in past
        var patient = Patient.Create(
            dto.FirstName,
            dto.LastName,
            dto.DateOfBirth,
            dto.Gender,
            dto.Phone,
            dto.Email,
            dto.Address);

        var created = await _patientRepository.AddAsync(patient, cancellationToken);
        return MapPatientToDto(created);
    }

    public async Task<PatientDto> UpdateAsync(int id, UpdatePatientDto dto, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(id, cancellationToken);
        if (patient == null) throw new NotFoundException(nameof(Patient), id);

        patient.Update(
            dto.FirstName,
            dto.LastName,
            dto.DateOfBirth,
            dto.Gender,
            dto.Phone,
            dto.Email,
            dto.Address);

        await _patientRepository.UpdateAsync(patient, cancellationToken);
        return MapPatientToDto(patient);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var p = await _patientRepository.GetByIdAsync(id, cancellationToken);
        if (p == null) throw new NotFoundException(nameof(Patient), id);
        await _patientRepository.DeleteAsync(p, cancellationToken);
    }

    private static PatientDto MapPatientToDto(Patient p) => new()
    {
        Id = p.Id,
        FirstName = p.FirstName,
        LastName = p.LastName,
        DateOfBirth = p.DateOfBirth,
        Gender = p.Gender,
        Phone = p.Phone,
        Email = p.Email,
        Address = p.Address,
        CreatedAt = p.CreatedAt
    };
}

// ==============================================================================
// 3. DOCTOR SERVICE
// ==============================================================================
public class DoctorService : IDoctorService
{
    private readonly IDoctorRepository _doctorRepository;
    private readonly IDepartmentRepository _departmentRepository;
    private readonly ICacheService _cacheService;

    public DoctorService(IDoctorRepository doctorRepository, IDepartmentRepository departmentRepository, ICacheService cacheService)
    {
        _doctorRepository = doctorRepository;
        _departmentRepository = departmentRepository;
        _cacheService = cacheService;
    }

    public async Task<IEnumerable<DoctorDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        const string cacheKey = "doctors:all";
        var cached = await _cacheService.GetAsync<IEnumerable<DoctorDto>>(cacheKey, cancellationToken);
        if (cached != null) return cached;

        var doctors = await _doctorRepository.GetAllAsync(cancellationToken);
        var dtos = doctors.Select(d => new DoctorDto
        {
            Id = d.Id,
            FirstName = d.FirstName,
            LastName = d.LastName,
            Specialization = d.Specialization,
            Phone = d.Phone,
            Email = d.Email,
            DepartmentId = d.DepartmentId,
            DepartmentName = d.Department?.Name ?? string.Empty,
            CreatedAt = d.CreatedAt
        }).ToList();

        await _cacheService.SetAsync(cacheKey, dtos, TimeSpan.FromMinutes(10), cancellationToken);
        return dtos;
    }

    public async Task<DoctorDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var d = await _doctorRepository.GetByIdAsync(id, cancellationToken);
        if (d == null) throw new NotFoundException(nameof(Doctor), id);
        return new DoctorDto
        {
            Id = d.Id,
            FirstName = d.FirstName,
            LastName = d.LastName,
            Specialization = d.Specialization,
            Phone = d.Phone,
            Email = d.Email,
            DepartmentId = d.DepartmentId,
            DepartmentName = d.Department?.Name ?? string.Empty,
            CreatedAt = d.CreatedAt
        };
    }

    public async Task<DoctorDto> CreateAsync(CreateDoctorDto dto, CancellationToken cancellationToken = default)
    {
        var dept = await _departmentRepository.GetByIdAsync(dto.DepartmentId, cancellationToken);
        if (dept == null) throw new NotFoundException(nameof(Department), dto.DepartmentId);

        var doctor = Doctor.Create(
            dto.FirstName,
            dto.LastName,
            dto.Specialization,
            dto.Phone,
            dto.Email,
            dto.DepartmentId);

        var created = await _doctorRepository.AddAsync(doctor, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("doctors:", cancellationToken);

        return new DoctorDto
        {
            Id = created.Id,
            FirstName = created.FirstName,
            LastName = created.LastName,
            Specialization = created.Specialization,
            Phone = created.Phone,
            Email = created.Email,
            DepartmentId = created.DepartmentId,
            DepartmentName = dept.Name,
            CreatedAt = created.CreatedAt
        };
    }

    public async Task<DoctorDto> UpdateAsync(int id, UpdateDoctorDto dto, CancellationToken cancellationToken = default)
    {
        var doctor = await _doctorRepository.GetByIdAsync(id, cancellationToken);
        if (doctor == null) throw new NotFoundException(nameof(Doctor), id);

        var dept = await _departmentRepository.GetByIdAsync(dto.DepartmentId, cancellationToken);
        if (dept == null) throw new NotFoundException(nameof(Department), dto.DepartmentId);

        doctor.Update(
            dto.FirstName,
            dto.LastName,
            dto.Specialization,
            dto.Phone,
            dto.Email,
            dto.DepartmentId);

        await _doctorRepository.UpdateAsync(doctor, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("doctors:", cancellationToken);

        return new DoctorDto
        {
            Id = doctor.Id,
            FirstName = doctor.FirstName,
            LastName = doctor.LastName,
            Specialization = doctor.Specialization,
            Phone = doctor.Phone,
            Email = doctor.Email,
            DepartmentId = doctor.DepartmentId,
            DepartmentName = dept.Name,
            CreatedAt = doctor.CreatedAt
        };
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var doctor = await _doctorRepository.GetByIdAsync(id, cancellationToken);
        if (doctor == null) throw new NotFoundException(nameof(Doctor), id);

        await _doctorRepository.DeleteAsync(doctor, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("doctors:", cancellationToken);
    }
}

// ==============================================================================
// 4. DEPARTMENT SERVICE
// ==============================================================================
public class DepartmentService : IDepartmentService
{
    private readonly IDepartmentRepository _departmentRepository;
    private readonly ICacheService _cacheService;

    public DepartmentService(IDepartmentRepository departmentRepository, ICacheService cacheService)
    {
        _departmentRepository = departmentRepository;
        _cacheService = cacheService;
    }

    public async Task<IEnumerable<DepartmentDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        const string cacheKey = "departments:all";
        var cached = await _cacheService.GetAsync<IEnumerable<DepartmentDto>>(cacheKey, cancellationToken);
        if (cached != null) return cached;

        var depts = await _departmentRepository.GetAllAsync(cancellationToken);
        var dtos = depts.Select(d => new DepartmentDto { Id = d.Id, Name = d.Name, Description = d.Description }).ToList();
        await _cacheService.SetAsync(cacheKey, dtos, TimeSpan.FromMinutes(15), cancellationToken);
        return dtos;
    }

    public async Task<DepartmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var d = await _departmentRepository.GetByIdAsync(id, cancellationToken);
        if (d == null) throw new NotFoundException(nameof(Department), id);
        return new DepartmentDto { Id = d.Id, Name = d.Name, Description = d.Description };
    }

    public async Task<DepartmentDto> CreateAsync(CreateDepartmentDto dto, CancellationToken cancellationToken = default)
    {
        var dept = Department.Create(dto.Name, dto.Description);
        var created = await _departmentRepository.AddAsync(dept, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("departments:", cancellationToken);
        return new DepartmentDto { Id = created.Id, Name = created.Name, Description = created.Description };
    }

    public async Task<DepartmentDto> UpdateAsync(int id, UpdateDepartmentDto dto, CancellationToken cancellationToken = default)
    {
        var dept = await _departmentRepository.GetByIdAsync(id, cancellationToken);
        if (dept == null) throw new NotFoundException(nameof(Department), id);

        dept.Update(dto.Name, dto.Description);
        await _departmentRepository.UpdateAsync(dept, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("departments:", cancellationToken);
        return new DepartmentDto { Id = dept.Id, Name = dept.Name, Description = dept.Description };
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var dept = await _departmentRepository.GetByIdAsync(id, cancellationToken);
        if (dept == null) throw new NotFoundException(nameof(Department), id);

        await _departmentRepository.DeleteAsync(dept, cancellationToken);
        await _cacheService.RemoveByPrefixAsync("departments:", cancellationToken);
    }
}

// ==============================================================================
// 5. MEDICAL RECORD SERVICE
// ==============================================================================
public class MedicalRecordService : IMedicalRecordService
{
    private readonly IMedicalRecordRepository _medicalRecordRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IDoctorRepository _doctorRepository;

    public MedicalRecordService(
        IMedicalRecordRepository medicalRecordRepository,
        IPatientRepository patientRepository,
        IDoctorRepository doctorRepository)
    {
        _medicalRecordRepository = medicalRecordRepository;
        _patientRepository = patientRepository;
        _doctorRepository = doctorRepository;
    }

    public async Task<IEnumerable<MedicalRecordDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var records = await _medicalRecordRepository.GetAllAsync(cancellationToken);
        return records.Select(MapToDto).ToList();
    }

    public async Task<IEnumerable<MedicalRecordDto>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        if (!await _patientRepository.ExistsAsync(patientId, cancellationToken))
            throw new NotFoundException(nameof(Patient), patientId);

        var records = await _medicalRecordRepository.GetByPatientIdAsync(patientId, cancellationToken);
        return records.Select(MapToDto).ToList();
    }

    public async Task<MedicalRecordDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var record = await _medicalRecordRepository.GetByIdAsync(id, cancellationToken);
        if (record == null) throw new NotFoundException(nameof(MedicalRecord), id);
        return MapToDto(record);
    }

    public async Task<MedicalRecordDto> CreateAsync(CreateMedicalRecordDto dto, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(dto.PatientId, cancellationToken);
        if (patient == null) throw new NotFoundException(nameof(Patient), dto.PatientId);

        var doctor = await _doctorRepository.GetByIdAsync(dto.DoctorId, cancellationToken);
        if (doctor == null) throw new NotFoundException(nameof(Doctor), dto.DoctorId);

        var record = MedicalRecord.Create(
            dto.PatientId,
            dto.DoctorId,
            null,
            dto.Diagnosis,
            dto.Symptoms,
            dto.Treatment,
            dto.Notes);

        var created = await _medicalRecordRepository.AddAsync(record, cancellationToken);
        created.Patient = patient;
        created.Doctor = doctor;
        return MapToDto(created);
    }

    public async Task<MedicalRecordDto> UpdateAsync(int id, UpdateMedicalRecordDto dto, CancellationToken cancellationToken = default)
    {
        var record = await _medicalRecordRepository.GetByIdAsync(id, cancellationToken);
        if (record == null) throw new NotFoundException(nameof(MedicalRecord), id);

        record.Update(dto.Diagnosis, dto.Symptoms, dto.Treatment, dto.Notes);

        await _medicalRecordRepository.UpdateAsync(record, cancellationToken);
        return MapToDto(record);
    }

    private static MedicalRecordDto MapToDto(MedicalRecord r) => new()
    {
        Id = r.Id,
        PatientId = r.PatientId,
        PatientName = r.Patient != null ? $"{r.Patient.FirstName} {r.Patient.LastName}" : string.Empty,
        DoctorId = r.DoctorId,
        DoctorName = r.Doctor != null ? $"Dr. {r.Doctor.FirstName} {r.Doctor.LastName}" : string.Empty,
        Diagnosis = r.Diagnosis,
        Symptoms = r.Symptoms,
        Treatment = r.Treatment,
        Notes = r.Notes,
        CreatedAt = r.CreatedAt
    };
}

// ==============================================================================
// 6. PRESCRIPTION SERVICE
// ==============================================================================
public class PrescriptionService : IPrescriptionService
{
    private readonly IPrescriptionRepository _prescriptionRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IDoctorRepository _doctorRepository;

    public PrescriptionService(
        IPrescriptionRepository prescriptionRepository,
        IPatientRepository patientRepository,
        IDoctorRepository doctorRepository)
    {
        _prescriptionRepository = prescriptionRepository;
        _patientRepository = patientRepository;
        _doctorRepository = doctorRepository;
    }

    public async Task<IEnumerable<PrescriptionDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var prescriptions = await _prescriptionRepository.GetAllAsync(cancellationToken);
        return prescriptions.Select(MapToDto).ToList();
    }

    public async Task<IEnumerable<PrescriptionDto>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        if (!await _patientRepository.ExistsAsync(patientId, cancellationToken))
            throw new NotFoundException(nameof(Patient), patientId);

        var list = await _prescriptionRepository.GetByPatientIdAsync(patientId, cancellationToken);
        return list.Select(MapToDto).ToList();
    }

    public async Task<PrescriptionDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var p = await _prescriptionRepository.GetByIdAsync(id, cancellationToken);
        if (p == null) throw new NotFoundException(nameof(Prescription), id);
        return MapToDto(p);
    }

    public async Task<PrescriptionDto> CreateAsync(CreatePrescriptionDto dto, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(dto.PatientId, cancellationToken);
        if (patient == null) throw new NotFoundException(nameof(Patient), dto.PatientId);

        var doctor = await _doctorRepository.GetByIdAsync(dto.DoctorId, cancellationToken);
        if (doctor == null) throw new NotFoundException(nameof(Doctor), dto.DoctorId);

        var items = dto.Items.Select(item =>
            PrescriptionItem.Create(
                item.MedicationName,
                item.Dosage,
                item.Frequency,
                item.Duration,
                item.Instructions)).ToList();

        // Domain Aggregate Root enforces at least one medication item and ddd structure
        var prescription = Prescription.Create(
            dto.PatientId,
            dto.DoctorId,
            dto.AppointmentId,
            items,
            dto.Notes);

        var created = await _prescriptionRepository.AddAsync(prescription, cancellationToken);
        created.Patient = patient;
        created.Doctor = doctor;
        return MapToDto(created);
    }

    public async Task<PrescriptionDto> UpdateAsync(int id, UpdatePrescriptionDto dto, CancellationToken cancellationToken = default)
    {
        var p = await _prescriptionRepository.GetByIdAsync(id, cancellationToken);
        if (p == null) throw new NotFoundException(nameof(Prescription), id);

        var items = dto.Items.Select(item =>
            PrescriptionItem.Create(
                item.MedicationName,
                item.Dosage,
                item.Frequency,
                item.Duration,
                item.Instructions)).ToList();

        p.Update(dto.Notes, items);

        await _prescriptionRepository.UpdateAsync(p, cancellationToken);
        return MapToDto(p);
    }

    private static PrescriptionDto MapToDto(Prescription p) => new()
    {
        Id = p.Id,
        PatientId = p.PatientId,
        PatientName = p.Patient != null ? $"{p.Patient.FirstName} {p.Patient.LastName}" : string.Empty,
        DoctorId = p.DoctorId,
        DoctorName = p.Doctor != null ? $"Dr. {p.Doctor.FirstName} {p.Doctor.LastName}" : string.Empty,
        AppointmentId = p.AppointmentId,
        PrescriptionDate = p.PrescriptionDate,
        Notes = p.Notes,
        CreatedAt = p.CreatedAt,
        Items = p.PrescriptionItems.Select(i => new PrescriptionItemDto
        {
            Id = i.Id,
            PrescriptionId = i.PrescriptionId,
            MedicationName = i.MedicationName,
            Dosage = i.Dosage,
            Frequency = i.Frequency,
            Duration = i.Duration,
            Instructions = i.Instructions
        }).ToList()
    };
}

// ==============================================================================
// 7. AUTH SERVICE
// ==============================================================================
public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IConfiguration _configuration;

    public AuthService(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto, CancellationToken cancellationToken = default)
    {
        var identifier = dto.UsernameOrEmail.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByUsernameAsync(identifier, cancellationToken)
                   ?? await _userRepository.GetByEmailAsync(identifier, cancellationToken);

        if (user == null)
            throw new BusinessRuleException("Invalid username or password.");

        if (!_passwordHasher.VerifyPasswordHash(dto.Password, user.PasswordHash, user.PasswordSalt))
            throw new BusinessRuleException("Invalid username or password.");

        return GenerateAuthResponse(user);
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto, CancellationToken cancellationToken = default)
    {
        if (await _userRepository.UsernameExistsAsync(dto.Username.Trim().ToLowerInvariant(), cancellationToken))
            throw new ConflictException($"Username '{dto.Username}' is already taken.");

        if (await _userRepository.EmailExistsAsync(dto.Email.Trim().ToLowerInvariant(), cancellationToken))
            throw new ConflictException($"Email '{dto.Email}' is already registered.");

        _passwordHasher.CreatePasswordHash(dto.Password, out var hash, out var salt);

        // Domain Entity creates user
        var user = User.Create(
            dto.Username,
            dto.Email,
            dto.FullName,
            hash,
            salt,
            dto.Role);

        var created = await _userRepository.AddAsync(user, cancellationToken);
        return GenerateAuthResponse(created);
    }

    public async Task<UserDto> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null) throw new NotFoundException(nameof(User), userId);

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            CreatedAt = user.CreatedAt
        };
    }

    private AuthResponseDto GenerateAuthResponse(User user)
    {
        var secretKey = _configuration["Jwt:SecretKey"] ?? "HospitalManagement_SuperSecretKey_ForDevelopment_MustBeAtLeast32BytesLong!";
        var issuer = _configuration["Jwt:Issuer"] ?? "HospitalManagementAPI";
        var audience = _configuration["Jwt:Audience"] ?? "HospitalManagementClients";
        var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryInMinutes"], out var minutes) ? minutes : 480;

        var token = _jwtTokenGenerator.GenerateToken(user, secretKey, issuer, audience, expiryMinutes);
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        return new AuthResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                CreatedAt = user.CreatedAt
            }
        };
    }
}
