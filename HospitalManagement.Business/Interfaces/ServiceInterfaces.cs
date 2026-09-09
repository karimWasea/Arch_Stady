using HospitalManagement.Business.DTOs.Appointment;
using HospitalManagement.Business.DTOs.Department;
using HospitalManagement.Business.DTOs.Doctor;
using HospitalManagement.Business.DTOs.MedicalRecord;
using HospitalManagement.Business.DTOs.Patient;
using HospitalManagement.Business.DTOs.Prescription;

namespace HospitalManagement.Business.Interfaces;

public interface IPatientService
{
    Task<IEnumerable<PatientDto>> GetAllAsync();
    Task<PatientDto> GetByIdAsync(int id);
    Task<PatientDto> CreateAsync(CreatePatientDto dto);
    Task<PatientDto> UpdateAsync(int id, UpdatePatientDto dto);
    Task DeleteAsync(int id);
}

public interface IDoctorService
{
    Task<IEnumerable<DoctorDto>> GetAllAsync();
    Task<DoctorDto> GetByIdAsync(int id);
    Task<DoctorDto> CreateAsync(CreateDoctorDto dto);
    Task<DoctorDto> UpdateAsync(int id, UpdateDoctorDto dto);
    Task DeleteAsync(int id);
}

public interface IDepartmentService
{
    Task<IEnumerable<DepartmentDto>> GetAllAsync();
    Task<DepartmentDto> GetByIdAsync(int id);
    Task<DepartmentDto> CreateAsync(CreateDepartmentDto dto);
    Task<DepartmentDto> UpdateAsync(int id, UpdateDepartmentDto dto);
    Task DeleteAsync(int id);
}

public interface IAppointmentService
{
    Task<IEnumerable<AppointmentDto>> GetAllAsync();
    Task<AppointmentDto> GetByIdAsync(int id);
    Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto);
    Task<AppointmentDto> UpdateAsync(int id, UpdateAppointmentDto dto);
    Task<AppointmentDto> CompleteAsync(int id);
    Task<AppointmentDto> CancelAsync(int id);
    Task DeleteAsync(int id);
}

public interface IMedicalRecordService
{
    Task<IEnumerable<MedicalRecordDto>> GetAllAsync();
    Task<MedicalRecordDto> GetByIdAsync(int id);
    Task<MedicalRecordDto> CreateAsync(CreateMedicalRecordDto dto);
    Task<MedicalRecordDto> UpdateAsync(int id, UpdateMedicalRecordDto dto);
    Task DeleteAsync(int id);
}

public interface IPrescriptionService
{
    Task<IEnumerable<PrescriptionDto>> GetAllAsync();
    Task<PrescriptionDto> GetByIdAsync(int id);
    Task<PrescriptionDto> CreateAsync(CreatePrescriptionDto dto);
    Task<PrescriptionDto> UpdateAsync(int id, UpdatePrescriptionDto dto);
    Task DeleteAsync(int id);
}
