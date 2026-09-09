using HospitalManagement.Business.DTOs.Doctor;
using HospitalManagement.Business.Exceptions;
using HospitalManagement.Business.Interfaces;
using HospitalManagement.DataAccess.Context;
using HospitalManagement.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Business.Services;

public class DoctorService : IDoctorService
{
    private readonly ApplicationDbContext _context;

    public DoctorService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<DoctorDto>> GetAllAsync()
    {
        return await _context.Doctors
            .AsNoTracking()
            .Include(d => d.Department)
            .Select(d => new DoctorDto
            {
                Id = d.Id,
                FirstName = d.FirstName,
                LastName = d.LastName,
                Specialization = d.Specialization,
                Phone = d.Phone,
                Email = d.Email,
                DepartmentId = d.DepartmentId,
                DepartmentName = d.Department != null ? d.Department.Name : null,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<DoctorDto> GetByIdAsync(int id)
    {
        var doctor = await _context.Doctors
            .AsNoTracking()
            .Include(d => d.Department)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doctor == null)
        {
            throw new NotFoundException(nameof(Doctor), id);
        }

        return new DoctorDto
        {
            Id = doctor.Id,
            FirstName = doctor.FirstName,
            LastName = doctor.LastName,
            Specialization = doctor.Specialization,
            Phone = doctor.Phone,
            Email = doctor.Email,
            DepartmentId = doctor.DepartmentId,
            DepartmentName = doctor.Department?.Name,
            CreatedAt = doctor.CreatedAt
        };
    }

    public async Task<DoctorDto> CreateAsync(CreateDoctorDto dto)
    {
        // Business Rule: Doctor must belong to an existing Department
        var departmentExists = await _context.Departments.AnyAsync(d => d.Id == dto.DepartmentId);
        if (!departmentExists)
        {
            throw new NotFoundException("Department", dto.DepartmentId);
        }

        var emailExists = await _context.Doctors.AnyAsync(d => d.Email == dto.Email);
        if (emailExists)
        {
            throw new ConflictException($"A doctor with email '{dto.Email}' already exists.");
        }

        var doctor = new Doctor
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Specialization = dto.Specialization,
            Phone = dto.Phone,
            Email = dto.Email,
            DepartmentId = dto.DepartmentId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Doctors.Add(doctor);
        await _context.SaveChangesAsync();

        var department = await _context.Departments.FindAsync(dto.DepartmentId);

        return new DoctorDto
        {
            Id = doctor.Id,
            FirstName = doctor.FirstName,
            LastName = doctor.LastName,
            Specialization = doctor.Specialization,
            Phone = doctor.Phone,
            Email = doctor.Email,
            DepartmentId = doctor.DepartmentId,
            DepartmentName = department?.Name,
            CreatedAt = doctor.CreatedAt
        };
    }

    public async Task<DoctorDto> UpdateAsync(int id, UpdateDoctorDto dto)
    {
        var doctor = await _context.Doctors.FindAsync(id);
        if (doctor == null)
        {
            throw new NotFoundException(nameof(Doctor), id);
        }

        // Validate department
        if (doctor.DepartmentId != dto.DepartmentId)
        {
            var deptExists = await _context.Departments.AnyAsync(d => d.Id == dto.DepartmentId);
            if (!deptExists)
            {
                throw new NotFoundException("Department", dto.DepartmentId);
            }
        }

        // Validate email uniqueness if changed
        if (doctor.Email != dto.Email)
        {
            var emailExists = await _context.Doctors.AnyAsync(d => d.Email == dto.Email && d.Id != id);
            if (emailExists)
            {
                throw new ConflictException($"A doctor with email '{dto.Email}' already exists.");
            }
        }

        doctor.FirstName = dto.FirstName;
        doctor.LastName = dto.LastName;
        doctor.Specialization = dto.Specialization;
        doctor.Phone = dto.Phone;
        doctor.Email = dto.Email;
        doctor.DepartmentId = dto.DepartmentId;

        await _context.SaveChangesAsync();

        var department = await _context.Departments.FindAsync(dto.DepartmentId);

        return new DoctorDto
        {
            Id = doctor.Id,
            FirstName = doctor.FirstName,
            LastName = doctor.LastName,
            Specialization = doctor.Specialization,
            Phone = doctor.Phone,
            Email = doctor.Email,
            DepartmentId = doctor.DepartmentId,
            DepartmentName = department?.Name,
            CreatedAt = doctor.CreatedAt
        };
    }

    public async Task DeleteAsync(int id)
    {
        var doctor = await _context.Doctors.FindAsync(id);
        if (doctor == null)
        {
            throw new NotFoundException(nameof(Doctor), id);
        }

        var hasAppointments = await _context.Appointments.AnyAsync(a => a.DoctorId == id);
        if (hasAppointments)
        {
            throw new ConflictException("Cannot delete doctor with assigned appointments.");
        }

        _context.Doctors.Remove(doctor);
        await _context.SaveChangesAsync();
    }
}
