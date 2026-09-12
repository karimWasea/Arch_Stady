using FluentValidation;
using HospitalManagement.Core.DTOs.Common;
using HospitalManagement.Core.DTOs.MedicalRecord;
using HospitalManagement.Core.Ports.Inbound;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.API.Controllers;

/// <summary>
/// Primary (Driving) Adapter for Medical Records.
/// Invokes Inbound Port (IMedicalRecordUseCases).
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MedicalRecordsController : ControllerBase
{
    private readonly IMedicalRecordUseCases _medicalRecordUseCases;
    private readonly IValidator<CreateMedicalRecordDto> _validator;

    public MedicalRecordsController(IMedicalRecordUseCases medicalRecordUseCases, IValidator<CreateMedicalRecordDto> validator)
    {
        _medicalRecordUseCases = medicalRecordUseCases;
        _validator = validator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<MedicalRecordDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var records = await _medicalRecordUseCases.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<MedicalRecordDto>>.Ok(records));
    }

    [HttpGet("patient/{patientId:int}")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<MedicalRecordDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByPatientId(int patientId)
    {
        var records = await _medicalRecordUseCases.GetByPatientIdAsync(patientId);
        return Ok(ApiResponse<IEnumerable<MedicalRecordDto>>.Ok(records));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<MedicalRecordDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var record = await _medicalRecordUseCases.GetByIdAsync(id);
        return Ok(ApiResponse<MedicalRecordDto>.Ok(record));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<MedicalRecordDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateMedicalRecordDto dto)
    {
        var validationResult = await _validator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _medicalRecordUseCases.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<MedicalRecordDto>.Ok(created, "Medical record created successfully."));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<MedicalRecordDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMedicalRecordDto dto)
    {
        var updated = await _medicalRecordUseCases.UpdateAsync(id, dto);
        return Ok(ApiResponse<MedicalRecordDto>.Ok(updated, "Medical record updated successfully."));
    }
}
