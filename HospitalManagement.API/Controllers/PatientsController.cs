using FluentValidation;
using HospitalManagement.Core.DTOs.Common;
using HospitalManagement.Core.DTOs.Patient;
using HospitalManagement.Core.Ports.Inbound;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.API.Controllers;

/// <summary>
/// Primary (Driving) Adapter for Patients.
/// Invokes Inbound Port (IPatientUseCases).
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PatientsController : ControllerBase
{
    private readonly IPatientUseCases _patientUseCases;
    private readonly IValidator<CreatePatientDto> _validator;

    public PatientsController(IPatientUseCases patientUseCases, IValidator<CreatePatientDto> validator)
    {
        _patientUseCases = patientUseCases;
        _validator = validator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<PatientDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var patients = await _patientUseCases.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<PatientDto>>.Ok(patients));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<PatientDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var patient = await _patientUseCases.GetByIdAsync(id);
        return Ok(ApiResponse<PatientDto>.Ok(patient));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<PatientDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreatePatientDto dto)
    {
        var validationResult = await _validator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _patientUseCases.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<PatientDto>.Ok(created, "Patient created successfully."));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<PatientDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePatientDto dto)
    {
        var updated = await _patientUseCases.UpdateAsync(id, dto);
        return Ok(ApiResponse<PatientDto>.Ok(updated, "Patient updated successfully."));
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        await _patientUseCases.DeleteAsync(id);
        return Ok(ApiResponse.Ok("Patient deleted successfully."));
    }
}
