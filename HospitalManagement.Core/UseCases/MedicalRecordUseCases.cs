using HospitalManagement.Core.Domain;
using HospitalManagement.Core.DTOs.MedicalRecord;
using HospitalManagement.Core.Exceptions;
using HospitalManagement.Core.Ports.Inbound;
using HospitalManagement.Core.Ports.Outbound.Repositories;

namespace HospitalManagement.Core.UseCases;

public class MedicalRecordUseCases : IMedicalRecordUseCases
{
    private readonly IMedicalRecordRepository _medicalRecordRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IDoctorRepository _doctorRepository;

    public MedicalRecordUseCases(
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
        var patientExists = await _patientRepository.ExistsAsync(patientId, cancellationToken);
        if (!patientExists)
        {
            throw new NotFoundException(nameof(Patient), patientId);
        }

        var records = await _medicalRecordRepository.GetByPatientIdAsync(patientId, cancellationToken);
        return records.Select(MapToDto).ToList();
    }

    public async Task<MedicalRecordDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var record = await _medicalRecordRepository.GetByIdAsync(id, cancellationToken);
        if (record == null)
        {
            throw new NotFoundException(nameof(MedicalRecord), id);
        }

        return MapToDto(record);
    }

    public async Task<MedicalRecordDto> CreateAsync(CreateMedicalRecordDto dto, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(dto.PatientId, cancellationToken);
        if (patient == null)
        {
            throw new NotFoundException(nameof(Patient), dto.PatientId);
        }

        var doctor = await _doctorRepository.GetByIdAsync(dto.DoctorId, cancellationToken);
        if (doctor == null)
        {
            throw new NotFoundException(nameof(Doctor), dto.DoctorId);
        }

        var record = new MedicalRecord
        {
            PatientId = dto.PatientId,
            DoctorId = dto.DoctorId,
            Diagnosis = dto.Diagnosis,
            Symptoms = dto.Symptoms,
            Treatment = dto.Treatment,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _medicalRecordRepository.AddAsync(record, cancellationToken);
        created.Patient = patient;
        created.Doctor = doctor;

        return MapToDto(created);
    }

    public async Task<MedicalRecordDto> UpdateAsync(int id, UpdateMedicalRecordDto dto, CancellationToken cancellationToken = default)
    {
        var record = await _medicalRecordRepository.GetByIdAsync(id, cancellationToken);
        if (record == null)
        {
            throw new NotFoundException(nameof(MedicalRecord), id);
        }

        record.Diagnosis = dto.Diagnosis;
        record.Symptoms = dto.Symptoms;
        record.Treatment = dto.Treatment;
        record.Notes = dto.Notes;

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
