using FluentValidation;
using HospitalManagement.Business.DTOs.Common;
using HospitalManagement.Business.DTOs.MedicalRecord;
using HospitalManagement.Business.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.API.Controllers;

[Authorize]
[ApiController]
[Route("api/medical-records")]
public class MedicalRecordsController : ControllerBase
{
    private readonly IMedicalRecordService _medicalRecordService;
    private readonly IValidator<CreateMedicalRecordDto> _validator;

    public MedicalRecordsController(IMedicalRecordService medicalRecordService, IValidator<CreateMedicalRecordDto> validator)
    {
        _medicalRecordService = medicalRecordService;
        _validator = validator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<MedicalRecordDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var records = await _medicalRecordService.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<MedicalRecordDto>>.Ok(records));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<MedicalRecordDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var record = await _medicalRecordService.GetByIdAsync(id);
        return Ok(ApiResponse<MedicalRecordDto>.Ok(record));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<MedicalRecordDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create([FromBody] CreateMedicalRecordDto dto)
    {
        var validationResult = await _validator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _medicalRecordService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<MedicalRecordDto>.Ok(created, "Medical record created successfully."));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<MedicalRecordDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMedicalRecordDto dto)
    {
        var updated = await _medicalRecordService.UpdateAsync(id, dto);
        return Ok(ApiResponse<MedicalRecordDto>.Ok(updated, "Medical record updated successfully."));
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        await _medicalRecordService.DeleteAsync(id);
        return Ok(ApiResponse.Ok("Medical record deleted successfully."));
    }
}
