using HospitalManagement.Business.DTOs.Patient;
using HospitalManagement.Business.Exceptions;
using HospitalManagement.Business.Interfaces;
using HospitalManagement.DataAccess.Context;
using HospitalManagement.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Business.Services;

public class PatientService : IPatientService
{
    private readonly ApplicationDbContext _context;

    public PatientService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PatientDto>> GetAllAsync()
    {
        return await _context.Patients
            .AsNoTracking()
            .Select(p => new PatientDto
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
            })
            .ToListAsync();
    }

    public async Task<PatientDto> GetByIdAsync(int id)
    {
        var patient = await _context.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (patient == null)
        {
            throw new NotFoundException(nameof(Patient), id);
        }

        return new PatientDto
        {
            Id = patient.Id,
            FirstName = patient.FirstName,
            LastName = patient.LastName,
            DateOfBirth = patient.DateOfBirth,
            Gender = patient.Gender,
            Phone = patient.Phone,
            Email = patient.Email,
            Address = patient.Address,
            CreatedAt = patient.CreatedAt
        };
    }

    public async Task<PatientDto> CreateAsync(CreatePatientDto dto)
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

        _context.Patients.Add(patient);
        await _context.SaveChangesAsync();

        return new PatientDto
        {
            Id = patient.Id,
            FirstName = patient.FirstName,
            LastName = patient.LastName,
            DateOfBirth = patient.DateOfBirth,
            Gender = patient.Gender,
            Phone = patient.Phone,
            Email = patient.Email,
            Address = patient.Address,
            CreatedAt = patient.CreatedAt
        };
    }

    public async Task<PatientDto> UpdateAsync(int id, UpdatePatientDto dto)
    {
        var patient = await _context.Patients.FindAsync(id);
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

        await _context.SaveChangesAsync();

        return new PatientDto
        {
            Id = patient.Id,
            FirstName = patient.FirstName,
            LastName = patient.LastName,
            DateOfBirth = patient.DateOfBirth,
            Gender = patient.Gender,
            Phone = patient.Phone,
            Email = patient.Email,
            Address = patient.Address,
            CreatedAt = patient.CreatedAt
        };
    }

    public async Task DeleteAsync(int id)
    {
        var patient = await _context.Patients.FindAsync(id);
        if (patient == null)
        {
            throw new NotFoundException(nameof(Patient), id);
        }

        var hasAppointments = await _context.Appointments.AnyAsync(a => a.PatientId == id);
        if (hasAppointments)
        {
            throw new ConflictException("Cannot delete patient with existing appointment history.");
        }

        _context.Patients.Remove(patient);
        await _context.SaveChangesAsync();
    }
}
