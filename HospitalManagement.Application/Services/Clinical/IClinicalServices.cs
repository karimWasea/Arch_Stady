using HospitalManagement.Application.DTOs.Auth;
using HospitalManagement.Application.DTOs.Clinical;

namespace HospitalManagement.Application.Services.Clinical;

public interface IAppointmentService
{
    Task<IEnumerable<AppointmentDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<AppointmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto, CancellationToken cancellationToken = default);
    Task<AppointmentDto> UpdateAsync(int id, UpdateAppointmentDto dto, CancellationToken cancellationToken = default);
    Task<AppointmentDto> CancelAsync(int id, CancellationToken cancellationToken = default);
    Task<AppointmentDto> CompleteAsync(int id, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

public interface IPatientService
{
    Task<IEnumerable<PatientDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PatientDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<PatientDto> CreateAsync(CreatePatientDto dto, CancellationToken cancellationToken = default);
    Task<PatientDto> UpdateAsync(int id, UpdatePatientDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

public interface IDoctorService
{
    Task<IEnumerable<DoctorDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<DoctorDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DoctorDto> CreateAsync(CreateDoctorDto dto, CancellationToken cancellationToken = default);
    Task<DoctorDto> UpdateAsync(int id, UpdateDoctorDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

public interface IDepartmentService
{
    Task<IEnumerable<DepartmentDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<DepartmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DepartmentDto> CreateAsync(CreateDepartmentDto dto, CancellationToken cancellationToken = default);
    Task<DepartmentDto> UpdateAsync(int id, UpdateDepartmentDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}

public interface IMedicalRecordService
{
    Task<IEnumerable<MedicalRecordDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<MedicalRecordDto>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<MedicalRecordDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<MedicalRecordDto> CreateAsync(CreateMedicalRecordDto dto, CancellationToken cancellationToken = default);
    Task<MedicalRecordDto> UpdateAsync(int id, UpdateMedicalRecordDto dto, CancellationToken cancellationToken = default);
}

public interface IPrescriptionService
{
    Task<IEnumerable<PrescriptionDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<PrescriptionDto>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<PrescriptionDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<PrescriptionDto> CreateAsync(CreatePrescriptionDto dto, CancellationToken cancellationToken = default);
    Task<PrescriptionDto> UpdateAsync(int id, UpdatePrescriptionDto dto, CancellationToken cancellationToken = default);
}

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken = default);
    Task<UserDto> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default);
}
