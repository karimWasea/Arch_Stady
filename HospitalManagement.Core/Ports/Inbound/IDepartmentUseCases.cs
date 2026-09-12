using HospitalManagement.Core.DTOs.Department;

namespace HospitalManagement.Core.Ports.Inbound;

public interface IDepartmentUseCases
{
    Task<IEnumerable<DepartmentDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<DepartmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DepartmentDto> CreateAsync(CreateDepartmentDto dto, CancellationToken cancellationToken = default);
    Task<DepartmentDto> UpdateAsync(int id, UpdateDepartmentDto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
