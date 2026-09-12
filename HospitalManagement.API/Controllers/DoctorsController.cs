using FluentValidation;
using HospitalManagement.Core.DTOs.Common;
using HospitalManagement.Core.DTOs.Doctor;
using HospitalManagement.Core.Ports.Inbound;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.API.Controllers;

/// <summary>
/// Primary (Driving) Adapter for Doctors.
/// Invokes Inbound Port (IDoctorUseCases).
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DoctorsController : ControllerBase
{
    private readonly IDoctorUseCases _doctorUseCases;
    private readonly IValidator<CreateDoctorDto> _validator;

    public DoctorsController(IDoctorUseCases doctorUseCases, IValidator<CreateDoctorDto> validator)
    {
        _doctorUseCases = doctorUseCases;
        _validator = validator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<DoctorDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var doctors = await _doctorUseCases.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<DoctorDto>>.Ok(doctors));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<DoctorDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var doctor = await _doctorUseCases.GetByIdAsync(id);
        return Ok(ApiResponse<DoctorDto>.Ok(doctor));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<DoctorDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateDoctorDto dto)
    {
        var validationResult = await _validator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _doctorUseCases.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<DoctorDto>.Ok(created, "Doctor created successfully."));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<DoctorDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDoctorDto dto)
    {
        var updated = await _doctorUseCases.UpdateAsync(id, dto);
        return Ok(ApiResponse<DoctorDto>.Ok(updated, "Doctor updated successfully."));
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id)
    {
        await _doctorUseCases.DeleteAsync(id);
        return Ok(ApiResponse.Ok("Doctor deleted successfully."));
    }
}
