using HospitalManagement.Business.DTOs.MedicalRecord;
using HospitalManagement.Business.Exceptions;
using HospitalManagement.Business.Interfaces;
using HospitalManagement.DataAccess.Context;
using HospitalManagement.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Business.Services;

public class MedicalRecordService : IMedicalRecordService
{
    private readonly ApplicationDbContext _context;

    public MedicalRecordService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MedicalRecordDto>> GetAllAsync()
    {
        return await _context.MedicalRecords
            .AsNoTracking()
            .Include(m => m.Patient)
            .Include(m => m.Doctor)
            .Select(m => new MedicalRecordDto
            {
                Id = m.Id,
                PatientId = m.PatientId,
                PatientName = m.Patient != null ? $"{m.Patient.FirstName} {m.Patient.LastName}" : string.Empty,
                DoctorId = m.DoctorId,
                DoctorName = m.Doctor != null ? $"Dr. {m.Doctor.FirstName} {m.Doctor.LastName}" : string.Empty,
                AppointmentId = m.AppointmentId,
                Diagnosis = m.Diagnosis,
                Symptoms = m.Symptoms,
                Treatment = m.Treatment,
                Notes = m.Notes,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<MedicalRecordDto> GetByIdAsync(int id)
    {
        var record = await _context.MedicalRecords
            .AsNoTracking()
            .Include(m => m.Patient)
            .Include(m => m.Doctor)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (record == null)
        {
            throw new NotFoundException(nameof(MedicalRecord), id);
        }

        return new MedicalRecordDto
        {
            Id = record.Id,
            PatientId = record.PatientId,
            PatientName = record.Patient != null ? $"{record.Patient.FirstName} {record.Patient.LastName}" : string.Empty,
            DoctorId = record.DoctorId,
            DoctorName = record.Doctor != null ? $"Dr. {record.Doctor.FirstName} {record.Doctor.LastName}" : string.Empty,
            AppointmentId = record.AppointmentId,
            Diagnosis = record.Diagnosis,
            Symptoms = record.Symptoms,
            Treatment = record.Treatment,
            Notes = record.Notes,
            CreatedAt = record.CreatedAt
        };
    }

    public async Task<MedicalRecordDto> CreateAsync(CreateMedicalRecordDto dto)
    {
        // Business Rule: MedicalRecord must reference existing Patient
        var patientExists = await _context.Patients.AnyAsync(p => p.Id == dto.PatientId);
        if (!patientExists)
        {
            throw new NotFoundException(nameof(Patient), dto.PatientId);
        }

        // Business Rule: MedicalRecord must reference existing Doctor
        var doctorExists = await _context.Doctors.AnyAsync(d => d.Id == dto.DoctorId);
        if (!doctorExists)
        {
            throw new NotFoundException(nameof(Doctor), dto.DoctorId);
        }

        // Business Rule: MedicalRecord must reference existing Appointment if provided
        if (dto.AppointmentId.HasValue)
        {
            var appointmentExists = await _context.Appointments.AnyAsync(a => a.Id == dto.AppointmentId.Value);
            if (!appointmentExists)
            {
                throw new NotFoundException(nameof(Appointment), dto.AppointmentId.Value);
            }
        }

        var record = new MedicalRecord
        {
            PatientId = dto.PatientId,
            DoctorId = dto.DoctorId,
            AppointmentId = dto.AppointmentId,
            Diagnosis = dto.Diagnosis,
            Symptoms = dto.Symptoms,
            Treatment = dto.Treatment,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.MedicalRecords.Add(record);
        await _context.SaveChangesAsync();

        var patient = await _context.Patients.FindAsync(dto.PatientId);
        var doctor = await _context.Doctors.FindAsync(dto.DoctorId);

        return new MedicalRecordDto
        {
            Id = record.Id,
            PatientId = record.PatientId,
            PatientName = patient != null ? $"{patient.FirstName} {patient.LastName}" : string.Empty,
            DoctorId = record.DoctorId,
            DoctorName = doctor != null ? $"Dr. {doctor.FirstName} {doctor.LastName}" : string.Empty,
            AppointmentId = record.AppointmentId,
            Diagnosis = record.Diagnosis,
            Symptoms = record.Symptoms,
            Treatment = record.Treatment,
            Notes = record.Notes,
            CreatedAt = record.CreatedAt
        };
    }

    public async Task<MedicalRecordDto> UpdateAsync(int id, UpdateMedicalRecordDto dto)
    {
        var record = await _context.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Doctor)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (record == null)
        {
            throw new NotFoundException(nameof(MedicalRecord), id);
        }

        record.Diagnosis = dto.Diagnosis;
        record.Symptoms = dto.Symptoms;
        record.Treatment = dto.Treatment;
        record.Notes = dto.Notes;

        await _context.SaveChangesAsync();

        return new MedicalRecordDto
        {
            Id = record.Id,
            PatientId = record.PatientId,
            PatientName = record.Patient != null ? $"{record.Patient.FirstName} {record.Patient.LastName}" : string.Empty,
            DoctorId = record.DoctorId,
            DoctorName = record.Doctor != null ? $"Dr. {record.Doctor.FirstName} {record.Doctor.LastName}" : string.Empty,
            AppointmentId = record.AppointmentId,
            Diagnosis = record.Diagnosis,
            Symptoms = record.Symptoms,
            Treatment = record.Treatment,
            Notes = record.Notes,
            CreatedAt = record.CreatedAt
        };
    }

    public async Task DeleteAsync(int id)
    {
        var record = await _context.MedicalRecords.FindAsync(id);
        if (record == null)
        {
            throw new NotFoundException(nameof(MedicalRecord), id);
        }

        _context.MedicalRecords.Remove(record);
        await _context.SaveChangesAsync();
    }
}
