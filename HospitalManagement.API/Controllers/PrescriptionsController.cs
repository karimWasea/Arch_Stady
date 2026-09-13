using FluentValidation;
using HospitalManagement.Application.DTOs.Clinical;
using HospitalManagement.Application.DTOs.Common;
using HospitalManagement.Application.Services.Clinical;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.API.Controllers;

/// <summary>
/// Presentation Layer: Prescriptions Controller.
/// Invokes Application service IPrescriptionService.
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PrescriptionsController : ControllerBase
{
    private readonly IPrescriptionService _prescriptionService;
    private readonly IValidator<CreatePrescriptionDto> _validator;

    public PrescriptionsController(IPrescriptionService prescriptionService, IValidator<CreatePrescriptionDto> validator)
    {
        _prescriptionService = prescriptionService;
        _validator = validator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<PrescriptionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var prescriptions = await _prescriptionService.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<PrescriptionDto>>.Ok(prescriptions));
    }

    [HttpGet("patient/{patientId:int}")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<PrescriptionDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByPatientId(int patientId)
    {
        var prescriptions = await _prescriptionService.GetByPatientIdAsync(patientId);
        return Ok(ApiResponse<IEnumerable<PrescriptionDto>>.Ok(prescriptions));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<PrescriptionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var prescription = await _prescriptionService.GetByIdAsync(id);
        return Ok(ApiResponse<PrescriptionDto>.Ok(prescription));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<PrescriptionDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreatePrescriptionDto dto)
    {
        var validationResult = await _validator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _prescriptionService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<PrescriptionDto>.Ok(created, "Prescription created successfully."));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<PrescriptionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePrescriptionDto dto)
    {
        var updated = await _prescriptionService.UpdateAsync(id, dto);
        return Ok(ApiResponse<PrescriptionDto>.Ok(updated, "Prescription updated successfully."));
    }
}
