using HospitalManagement.Business.DTOs.Department;
using HospitalManagement.Business.Exceptions;
using HospitalManagement.Business.Interfaces;
using HospitalManagement.DataAccess.Context;
using HospitalManagement.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Business.Services;

public class DepartmentService : IDepartmentService
{
    private readonly ApplicationDbContext _context;

    public DepartmentService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<DepartmentDto>> GetAllAsync()
    {
        return await _context.Departments
            .AsNoTracking()
            .Select(d => new DepartmentDto
            {
                Id = d.Id,
                Name = d.Name,
                Description = d.Description,
                DoctorsCount = d.Doctors.Count
            })
            .ToListAsync();
    }

    public async Task<DepartmentDto> GetByIdAsync(int id)
    {
        var department = await _context.Departments
            .AsNoTracking()
            .Include(d => d.Doctors)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
        {
            throw new NotFoundException(nameof(Department), id);
        }

        return new DepartmentDto
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description,
            DoctorsCount = department.Doctors.Count
        };
    }

    public async Task<DepartmentDto> CreateAsync(CreateDepartmentDto dto)
    {
        var department = new Department
        {
            Name = dto.Name,
            Description = dto.Description
        };

        _context.Departments.Add(department);
        await _context.SaveChangesAsync();

        return new DepartmentDto
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description,
            DoctorsCount = 0
        };
    }

    public async Task<DepartmentDto> UpdateAsync(int id, UpdateDepartmentDto dto)
    {
        var department = await _context.Departments.FindAsync(id);
        if (department == null)
        {
            throw new NotFoundException(nameof(Department), id);
        }

        department.Name = dto.Name;
        department.Description = dto.Description;

        await _context.SaveChangesAsync();

        return new DepartmentDto
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description,
            DoctorsCount = await _context.Doctors.CountAsync(d => d.DepartmentId == id)
        };
    }

    public async Task DeleteAsync(int id)
    {
        var department = await _context.Departments
            .Include(d => d.Doctors)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
        {
            throw new NotFoundException(nameof(Department), id);
        }

        if (department.Doctors.Any())
        {
            throw new ConflictException("Cannot delete department because it still has registered doctors.");
        }

        _context.Departments.Remove(department);
        await _context.SaveChangesAsync();
    }
}
