using HospitalManagement.Core.Domain;
using HospitalManagement.Core.DTOs.Doctor;
using HospitalManagement.Core.Exceptions;
using HospitalManagement.Core.Ports.Inbound;
using HospitalManagement.Core.Ports.Outbound.Caching;
using HospitalManagement.Core.Ports.Outbound.Repositories;

namespace HospitalManagement.Core.UseCases;

public class DoctorUseCases : IDoctorUseCases
{
    private readonly IDoctorRepository _doctorRepository;
    private readonly IDepartmentRepository _departmentRepository;
    private readonly ICachePort _cachePort;

    public DoctorUseCases(
        IDoctorRepository doctorRepository,
        IDepartmentRepository departmentRepository,
        ICachePort cachePort)
    {
        _doctorRepository = doctorRepository;
        _departmentRepository = departmentRepository;
        _cachePort = cachePort;
    }

    public async Task<IEnumerable<DoctorDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        const string cacheKey = "doctors:all";

        // 1. Check Redis Cache via Driven Port
        var cached = await _cachePort.GetAsync<IEnumerable<DoctorDto>>(cacheKey, cancellationToken);
        if (cached != null)
        {
            return cached;
        }

        // 2. Cache Miss: Fetch from Persistence Port
        var doctors = await _doctorRepository.GetAllAsync(cancellationToken);
        var dtos = doctors.Select(MapToDto).ToList();

        // 3. Store in Redis Cache (TTL: 10 minutes)
        await _cachePort.SetAsync(cacheKey, dtos, TimeSpan.FromMinutes(10), cancellationToken);

        return dtos;
    }

    public async Task<DoctorDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var doctor = await _doctorRepository.GetByIdAsync(id, cancellationToken);
        if (doctor == null)
        {
            throw new NotFoundException(nameof(Doctor), id);
        }

        return MapToDto(doctor);
    }

    public async Task<DoctorDto> CreateAsync(CreateDoctorDto dto, CancellationToken cancellationToken = default)
    {
        var department = await _departmentRepository.GetByIdAsync(dto.DepartmentId, cancellationToken);
        if (department == null)
        {
            throw new NotFoundException(nameof(Department), dto.DepartmentId);
        }

        var doctor = new Doctor
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Specialization = dto.Specialization,
            Email = dto.Email,
            Phone = dto.Phone,
            DepartmentId = dto.DepartmentId,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _doctorRepository.AddAsync(doctor, cancellationToken);
        created.Department = department;

        // Invalidate Redis cache
        await _cachePort.RemoveByPrefixAsync("doctors:", cancellationToken);

        return MapToDto(created);
    }

    public async Task<DoctorDto> UpdateAsync(int id, UpdateDoctorDto dto, CancellationToken cancellationToken = default)
    {
        var doctor = await _doctorRepository.GetByIdAsync(id, cancellationToken);
        if (doctor == null)
        {
            throw new NotFoundException(nameof(Doctor), id);
        }

        var department = await _departmentRepository.GetByIdAsync(dto.DepartmentId, cancellationToken);
        if (department == null)
        {
            throw new NotFoundException(nameof(Department), dto.DepartmentId);
        }

        doctor.FirstName = dto.FirstName;
        doctor.LastName = dto.LastName;
        doctor.Specialization = dto.Specialization;
        doctor.Email = dto.Email;
        doctor.Phone = dto.Phone;
        doctor.DepartmentId = dto.DepartmentId;

        await _doctorRepository.UpdateAsync(doctor, cancellationToken);
        doctor.Department = department;

        // Invalidate Redis cache
        await _cachePort.RemoveByPrefixAsync("doctors:", cancellationToken);

        return MapToDto(doctor);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var doctor = await _doctorRepository.GetByIdAsync(id, cancellationToken);
        if (doctor == null)
        {
            throw new NotFoundException(nameof(Doctor), id);
        }

        await _doctorRepository.DeleteAsync(doctor, cancellationToken);

        // Invalidate Redis cache
        await _cachePort.RemoveByPrefixAsync("doctors:", cancellationToken);
    }

    private static DoctorDto MapToDto(Doctor d) => new()
    {
        Id = d.Id,
        FirstName = d.FirstName,
        LastName = d.LastName,
        Specialization = d.Specialization,
        Email = d.Email,
        Phone = d.Phone,
        DepartmentId = d.DepartmentId,
        DepartmentName = d.Department?.Name ?? string.Empty,
        CreatedAt = d.CreatedAt
    };
}
