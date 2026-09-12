using HospitalManagement.Core.Domain;
using HospitalManagement.Core.DTOs.Prescription;
using HospitalManagement.Core.Exceptions;
using HospitalManagement.Core.Ports.Inbound;
using HospitalManagement.Core.Ports.Outbound.Repositories;

namespace HospitalManagement.Core.UseCases;

public class PrescriptionUseCases : IPrescriptionUseCases
{
    private readonly IPrescriptionRepository _prescriptionRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IDoctorRepository _doctorRepository;

    public PrescriptionUseCases(
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
        var patientExists = await _patientRepository.ExistsAsync(patientId, cancellationToken);
        if (!patientExists)
        {
            throw new NotFoundException(nameof(Patient), patientId);
        }

        var prescriptions = await _prescriptionRepository.GetByPatientIdAsync(patientId, cancellationToken);
        return prescriptions.Select(MapToDto).ToList();
    }

    public async Task<PrescriptionDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var prescription = await _prescriptionRepository.GetByIdAsync(id, cancellationToken);
        if (prescription == null)
        {
            throw new NotFoundException(nameof(Prescription), id);
        }

        return MapToDto(prescription);
    }

    public async Task<PrescriptionDto> CreateAsync(CreatePrescriptionDto dto, CancellationToken cancellationToken = default)
    {
        if (dto.Items == null || !dto.Items.Any())
        {
            throw new BusinessRuleException("A Prescription must contain at least one PrescriptionItem.");
        }

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

        var prescription = new Prescription
        {
            PatientId = dto.PatientId,
            DoctorId = dto.DoctorId,
            AppointmentId = dto.AppointmentId,
            PrescriptionDate = DateTime.UtcNow,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            PrescriptionItems = dto.Items.Select(item => new PrescriptionItem
            {
                MedicationName = item.MedicationName,
                Dosage = item.Dosage,
                Frequency = item.Frequency,
                Duration = item.Duration,
                Instructions = item.Instructions
            }).ToList()
        };

        var created = await _prescriptionRepository.AddAsync(prescription, cancellationToken);
        created.Patient = patient;
        created.Doctor = doctor;

        return MapToDto(created);
    }

    public async Task<PrescriptionDto> UpdateAsync(int id, UpdatePrescriptionDto dto, CancellationToken cancellationToken = default)
    {
        var prescription = await _prescriptionRepository.GetByIdAsync(id, cancellationToken);
        if (prescription == null)
        {
            throw new NotFoundException(nameof(Prescription), id);
        }

        if (dto.Items == null || !dto.Items.Any())
        {
            throw new BusinessRuleException("A Prescription must contain at least one PrescriptionItem.");
        }

        prescription.Notes = dto.Notes;
        prescription.PrescriptionItems = dto.Items.Select(item => new PrescriptionItem
        {
            PrescriptionId = id,
            MedicationName = item.MedicationName,
            Dosage = item.Dosage,
            Frequency = item.Frequency,
            Duration = item.Duration,
            Instructions = item.Instructions
        }).ToList();

        await _prescriptionRepository.UpdateAsync(prescription, cancellationToken);
        return MapToDto(prescription);
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
