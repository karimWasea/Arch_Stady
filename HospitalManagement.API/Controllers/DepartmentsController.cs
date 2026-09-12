using FluentValidation;
using HospitalManagement.Core.DTOs.Common;
using HospitalManagement.Core.DTOs.Department;
using HospitalManagement.Core.Ports.Inbound;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.API.Controllers;

/// <summary>
/// Primary (Driving) Adapter for Departments.
/// Invokes Inbound Port (IDepartmentUseCases).
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DepartmentsController : ControllerBase
{
    private readonly IDepartmentUseCases _departmentUseCases;
    private readonly IValidator<CreateDepartmentDto> _validator;

    public DepartmentsController(IDepartmentUseCases departmentUseCases, IValidator<CreateDepartmentDto> validator)
    {
        _departmentUseCases = departmentUseCases;
        _validator = validator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<DepartmentDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var departments = await _departmentUseCases.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<DepartmentDto>>.Ok(departments));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<DepartmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var department = await _departmentUseCases.GetByIdAsync(id);
        return Ok(ApiResponse<DepartmentDto>.Ok(department));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<DepartmentDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateDepartmentDto dto)
    {
        var validationResult = await _validator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _departmentUseCases.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<DepartmentDto>.Ok(created, "Department created successfully."));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<DepartmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDepartmentDto dto)
    {
        var updated = await _departmentUseCases.UpdateAsync(id, dto);
        return Ok(ApiResponse<DepartmentDto>.Ok(updated, "Department updated successfully."));
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        await _departmentUseCases.DeleteAsync(id);
        return Ok(ApiResponse.Ok("Department deleted successfully."));
    }
}
