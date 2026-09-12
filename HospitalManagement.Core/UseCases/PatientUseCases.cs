using HospitalManagement.Core.Domain;
using HospitalManagement.Core.DTOs.Patient;
using HospitalManagement.Core.Exceptions;
using HospitalManagement.Core.Ports.Inbound;
using HospitalManagement.Core.Ports.Outbound.Repositories;

namespace HospitalManagement.Core.UseCases;

public class PatientUseCases : IPatientUseCases
{
    private readonly IPatientRepository _patientRepository;

    public PatientUseCases(IPatientRepository patientRepository)
    {
        _patientRepository = patientRepository;
    }

    public async Task<IEnumerable<PatientDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var patients = await _patientRepository.GetAllAsync(cancellationToken);
        return patients.Select(MapToDto).ToList();
    }

    public async Task<PatientDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(id, cancellationToken);
        if (patient == null)
        {
            throw new NotFoundException(nameof(Patient), id);
        }

        return MapToDto(patient);
    }

    public async Task<PatientDto> CreateAsync(CreatePatientDto dto, CancellationToken cancellationToken = default)
    {
        var patient = new Patient
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            DateOfBirth = dto.DateOfBirth,
            Gender = dto.Gender,
            Phone = dto.Phone,
            Email = dto.Email,
            Address = dto.Address,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _patientRepository.AddAsync(patient, cancellationToken);
        return MapToDto(created);
    }

    public async Task<PatientDto> UpdateAsync(int id, UpdatePatientDto dto, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(id, cancellationToken);
        if (patient == null)
        {
            throw new NotFoundException(nameof(Patient), id);
        }

        patient.FirstName = dto.FirstName;
        patient.LastName = dto.LastName;
        patient.DateOfBirth = dto.DateOfBirth;
        patient.Gender = dto.Gender;
        patient.Phone = dto.Phone;
        patient.Email = dto.Email;
        patient.Address = dto.Address;

        await _patientRepository.UpdateAsync(patient, cancellationToken);
        return MapToDto(patient);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(id, cancellationToken);
        if (patient == null)
        {
            throw new NotFoundException(nameof(Patient), id);
        }

        await _patientRepository.DeleteAsync(patient, cancellationToken);
    }

    private static PatientDto MapToDto(Patient p) => new()
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
