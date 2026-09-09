using HospitalManagement.Business.DTOs.Prescription;
using HospitalManagement.Business.Exceptions;
using HospitalManagement.Business.Interfaces;
using HospitalManagement.DataAccess.Context;
using HospitalManagement.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Business.Services;

public class PrescriptionService : IPrescriptionService
{
    private readonly ApplicationDbContext _context;

    public PrescriptionService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PrescriptionDto>> GetAllAsync()
    {
        return await _context.Prescriptions
            .AsNoTracking()
            .Include(p => p.Patient)
            .Include(p => p.Doctor)
            .Include(p => p.PrescriptionItems)
            .Select(p => new PrescriptionDto
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
            })
            .ToListAsync();
    }

    public async Task<PrescriptionDto> GetByIdAsync(int id)
    {
        var p = await _context.Prescriptions
            .AsNoTracking()
            .Include(pr => pr.Patient)
            .Include(pr => pr.Doctor)
            .Include(pr => pr.PrescriptionItems)
            .FirstOrDefaultAsync(pr => pr.Id == id);

        if (p == null)
        {
            throw new NotFoundException(nameof(Prescription), id);
        }

        return new PrescriptionDto
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

    public async Task<PrescriptionDto> CreateAsync(CreatePrescriptionDto dto)
    {
        // Business Rule: Prescription must contain at least one PrescriptionItem
        if (dto.Items == null || !dto.Items.Any())
        {
            throw new BusinessRuleException("A Prescription must contain at least one PrescriptionItem.");
        }

        // Verify patient
        var patientExists = await _context.Patients.AnyAsync(p => p.Id == dto.PatientId);
        if (!patientExists)
        {
            throw new NotFoundException(nameof(Patient), dto.PatientId);
        }

        // Verify doctor
        var doctorExists = await _context.Doctors.AnyAsync(d => d.Id == dto.DoctorId);
        if (!doctorExists)
        {
            throw new NotFoundException(nameof(Doctor), dto.DoctorId);
        }

        // Verify appointment if provided
        if (dto.AppointmentId.HasValue)
        {
            var appointmentExists = await _context.Appointments.AnyAsync(a => a.Id == dto.AppointmentId.Value);
            if (!appointmentExists)
            {
                throw new NotFoundException(nameof(Appointment), dto.AppointmentId.Value);
            }
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

        _context.Prescriptions.Add(prescription);
        await _context.SaveChangesAsync();

        var patient = await _context.Patients.FindAsync(dto.PatientId);
        var doctor = await _context.Doctors.FindAsync(dto.DoctorId);

        return new PrescriptionDto
        {
            Id = prescription.Id,
            PatientId = prescription.PatientId,
            PatientName = patient != null ? $"{patient.FirstName} {patient.LastName}" : string.Empty,
            DoctorId = prescription.DoctorId,
            DoctorName = doctor != null ? $"Dr. {doctor.FirstName} {doctor.LastName}" : string.Empty,
            AppointmentId = prescription.AppointmentId,
            PrescriptionDate = prescription.PrescriptionDate,
            Notes = prescription.Notes,
            CreatedAt = prescription.CreatedAt,
            Items = prescription.PrescriptionItems.Select(i => new PrescriptionItemDto
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

    public async Task<PrescriptionDto> UpdateAsync(int id, UpdatePrescriptionDto dto)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.PrescriptionItems)
            .Include(p => p.Patient)
            .Include(p => p.Doctor)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (prescription == null)
        {
            throw new NotFoundException(nameof(Prescription), id);
        }

        if (dto.Items == null || !dto.Items.Any())
        {
            throw new BusinessRuleException("A Prescription must contain at least one PrescriptionItem.");
        }

        prescription.Notes = dto.Notes;

        // Replace items
        _context.PrescriptionItems.RemoveRange(prescription.PrescriptionItems);
        prescription.PrescriptionItems = dto.Items.Select(item => new PrescriptionItem
        {
            PrescriptionId = id,
            MedicationName = item.MedicationName,
            Dosage = item.Dosage,
            Frequency = item.Frequency,
            Duration = item.Duration,
            Instructions = item.Instructions
        }).ToList();

        await _context.SaveChangesAsync();

        return new PrescriptionDto
        {
            Id = prescription.Id,
            PatientId = prescription.PatientId,
            PatientName = prescription.Patient != null ? $"{prescription.Patient.FirstName} {prescription.Patient.LastName}" : string.Empty,
            DoctorId = prescription.DoctorId,
            DoctorName = prescription.Doctor != null ? $"Dr. {prescription.Doctor.FirstName} {prescription.Doctor.LastName}" : string.Empty,
            AppointmentId = prescription.AppointmentId,
            PrescriptionDate = prescription.PrescriptionDate,
            Notes = prescription.Notes,
            CreatedAt = prescription.CreatedAt,
            Items = prescription.PrescriptionItems.Select(i => new PrescriptionItemDto
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

    public async Task DeleteAsync(int id)
    {
        var prescription = await _context.Prescriptions
            .Include(p => p.PrescriptionItems)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (prescription == null)
        {
            throw new NotFoundException(nameof(Prescription), id);
        }

        _context.Prescriptions.Remove(prescription);
        await _context.SaveChangesAsync();
    }
}
