using HospitalManagement.Core.Domain;
using HospitalManagement.Core.DTOs.Department;
using HospitalManagement.Core.Exceptions;
using HospitalManagement.Core.Ports.Inbound;
using HospitalManagement.Core.Ports.Outbound.Caching;
using HospitalManagement.Core.Ports.Outbound.Repositories;

namespace HospitalManagement.Core.UseCases;

public class DepartmentUseCases : IDepartmentUseCases
{
    private readonly IDepartmentRepository _departmentRepository;
    private readonly ICachePort _cachePort;

    public DepartmentUseCases(IDepartmentRepository departmentRepository, ICachePort cachePort)
    {
        _departmentRepository = departmentRepository;
        _cachePort = cachePort;
    }

    public async Task<IEnumerable<DepartmentDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        const string cacheKey = "departments:all";
        var cached = await _cachePort.GetAsync<IEnumerable<DepartmentDto>>(cacheKey, cancellationToken);
        if (cached != null)
        {
            return cached;
        }

        var departments = await _departmentRepository.GetAllAsync(cancellationToken);
        var dtos = departments.Select(d => new DepartmentDto
        {
            Id = d.Id,
            Name = d.Name,
            Description = d.Description
        }).ToList();

        await _cachePort.SetAsync(cacheKey, dtos, TimeSpan.FromMinutes(15), cancellationToken);
        return dtos;
    }

    public async Task<DepartmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var department = await _departmentRepository.GetByIdAsync(id, cancellationToken);
        if (department == null)
        {
            throw new NotFoundException(nameof(Department), id);
        }

        return new DepartmentDto
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description
        };
    }

    public async Task<DepartmentDto> CreateAsync(CreateDepartmentDto dto, CancellationToken cancellationToken = default)
    {
        var department = new Department
        {
            Name = dto.Name,
            Description = dto.Description
        };

        var created = await _departmentRepository.AddAsync(department, cancellationToken);
        await _cachePort.RemoveByPrefixAsync("departments:", cancellationToken);

        return new DepartmentDto
        {
            Id = created.Id,
            Name = created.Name,
            Description = created.Description
        };
    }

    public async Task<DepartmentDto> UpdateAsync(int id, UpdateDepartmentDto dto, CancellationToken cancellationToken = default)
    {
        var department = await _departmentRepository.GetByIdAsync(id, cancellationToken);
        if (department == null)
        {
            throw new NotFoundException(nameof(Department), id);
        }

        department.Name = dto.Name;
        department.Description = dto.Description;

        await _departmentRepository.UpdateAsync(department, cancellationToken);
        await _cachePort.RemoveByPrefixAsync("departments:", cancellationToken);

        return new DepartmentDto
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description
        };
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var department = await _departmentRepository.GetByIdAsync(id, cancellationToken);
        if (department == null)
        {
            throw new NotFoundException(nameof(Department), id);
        }

        await _departmentRepository.DeleteAsync(department, cancellationToken);
        await _cachePort.RemoveByPrefixAsync("departments:", cancellationToken);
    }
}
