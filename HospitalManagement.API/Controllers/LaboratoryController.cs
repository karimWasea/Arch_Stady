using FluentValidation;
using HospitalManagement.Application.DTOs.Common;
using HospitalManagement.Application.DTOs.Laboratory;
using HospitalManagement.Application.Services.Laboratory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.API.Controllers;

/// <summary>
/// Presentation Layer: Laboratory Controller.
/// Manages Lab Test Catalog, Lab Orders, and Test Results.
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LaboratoryController : ControllerBase
{
    private readonly ILaboratoryService _laboratoryService;
    private readonly IValidator<CreateLabTestDto> _createLabTestValidator;
    private readonly IValidator<CreateLabOrderDto> _createLabOrderValidator;
    private readonly IValidator<RecordLabResultDto> _recordLabResultValidator;

    public LaboratoryController(
        ILaboratoryService laboratoryService,
        IValidator<CreateLabTestDto> createLabTestValidator,
        IValidator<CreateLabOrderDto> createLabOrderValidator,
        IValidator<RecordLabResultDto> recordLabResultValidator)
    {
        _laboratoryService = laboratoryService;
        _createLabTestValidator = createLabTestValidator;
        _createLabOrderValidator = createLabOrderValidator;
        _recordLabResultValidator = recordLabResultValidator;
    }

    // --- Lab Tests Catalog ---

    [HttpGet("tests")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<LabTestDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllLabTests()
    {
        var tests = await _laboratoryService.GetAllLabTestsAsync();
        return Ok(ApiResponse<IEnumerable<LabTestDto>>.Ok(tests));
    }

    [HttpGet("tests/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<LabTestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLabTestById(int id)
    {
        var test = await _laboratoryService.GetLabTestByIdAsync(id);
        return Ok(ApiResponse<LabTestDto>.Ok(test));
    }

    [HttpPost("tests")]
    [ProducesResponseType(typeof(ApiResponse<LabTestDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateLabTest([FromBody] CreateLabTestDto dto)
    {
        var validation = await _createLabTestValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new ValidationException(validation.Errors);

        var created = await _laboratoryService.CreateLabTestAsync(dto);
        return CreatedAtAction(nameof(GetLabTestById), new { id = created.Id }, ApiResponse<LabTestDto>.Ok(created, "Lab test created successfully."));
    }

    [HttpPut("tests/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<LabTestDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateLabTest(int id, [FromBody] UpdateLabTestDto dto)
    {
        var updated = await _laboratoryService.UpdateLabTestAsync(id, dto);
        return Ok(ApiResponse<LabTestDto>.Ok(updated, "Lab test updated successfully."));
    }

    [HttpDelete("tests/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteLabTest(int id)
    {
        await _laboratoryService.DeleteLabTestAsync(id);
        return Ok(ApiResponse.Ok("Lab test deleted successfully."));
    }

    // --- Lab Orders ---

    [HttpGet("orders")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<LabOrderDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllLabOrders()
    {
        var orders = await _laboratoryService.GetAllLabOrdersAsync();
        return Ok(ApiResponse<IEnumerable<LabOrderDto>>.Ok(orders));
    }

    [HttpGet("orders/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<LabOrderDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLabOrderById(int id)
    {
        var order = await _laboratoryService.GetLabOrderByIdAsync(id);
        return Ok(ApiResponse<LabOrderDto>.Ok(order));
    }

    [HttpGet("orders/patient/{patientId:int}")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<LabOrderDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLabOrdersByPatientId(int patientId)
    {
        var orders = await _laboratoryService.GetLabOrdersByPatientIdAsync(patientId);
        return Ok(ApiResponse<IEnumerable<LabOrderDto>>.Ok(orders));
    }

    [HttpPost("orders")]
    [ProducesResponseType(typeof(ApiResponse<LabOrderDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateLabOrder([FromBody] CreateLabOrderDto dto)
    {
        var validation = await _createLabOrderValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new ValidationException(validation.Errors);

        var created = await _laboratoryService.CreateLabOrderAsync(dto);
        return CreatedAtAction(nameof(GetLabOrderById), new { id = created.Id }, ApiResponse<LabOrderDto>.Ok(created, "Lab order placed successfully."));
    }

    // --- Lab Results ---

    [HttpGet("results/order/{orderId:int}")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<LabResultDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLabResultsByOrderId(int orderId)
    {
        var results = await _laboratoryService.GetLabResultsByOrderIdAsync(orderId);
        return Ok(ApiResponse<IEnumerable<LabResultDto>>.Ok(results));
    }

    [HttpPost("results")]
    [ProducesResponseType(typeof(ApiResponse<LabResultDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordLabResult([FromBody] RecordLabResultDto dto)
    {
        var validation = await _recordLabResultValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new ValidationException(validation.Errors);

        var recorded = await _laboratoryService.RecordLabResultAsync(dto);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<LabResultDto>.Ok(recorded, "Lab result recorded successfully."));
    }
}
