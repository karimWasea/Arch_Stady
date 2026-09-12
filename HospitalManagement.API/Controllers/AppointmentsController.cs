using FluentValidation;
using HospitalManagement.Core.DTOs.Appointment;
using HospitalManagement.Core.DTOs.Common;
using HospitalManagement.Core.Ports.Inbound;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.API.Controllers;

/// <summary>
/// Primary (Driving) Adapter for Appointments.
/// Accepts HTTP requests, validates input, calls Inbound Port (IAppointmentUseCases),
/// and returns HTTP responses.
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentUseCases _appointmentUseCases;
    private readonly IValidator<CreateAppointmentDto> _validator;

    public AppointmentsController(IAppointmentUseCases appointmentUseCases, IValidator<CreateAppointmentDto> validator)
    {
        _appointmentUseCases = appointmentUseCases;
        _validator = validator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<AppointmentDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var appointments = await _appointmentUseCases.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<AppointmentDto>>.Ok(appointments));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var appointment = await _appointmentUseCases.GetByIdAsync(id);
        return Ok(ApiResponse<AppointmentDto>.Ok(appointment));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<AppointmentDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentDto dto)
    {
        var validationResult = await _validator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _appointmentUseCases.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<AppointmentDto>.Ok(created, "Appointment scheduled successfully."));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAppointmentDto dto)
    {
        var updated = await _appointmentUseCases.UpdateAsync(id, dto);
        return Ok(ApiResponse<AppointmentDto>.Ok(updated, "Appointment updated successfully."));
    }

    [HttpPost("{id:int}/complete")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Complete(int id)
    {
        var appointment = await _appointmentUseCases.CompleteAsync(id);
        return Ok(ApiResponse<AppointmentDto>.Ok(appointment, "Appointment marked as completed."));
    }

    [HttpPost("{id:int}/cancel")]
    [ProducesResponseType(typeof(ApiResponse<AppointmentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Cancel(int id)
    {
        var appointment = await _appointmentUseCases.CancelAsync(id);
        return Ok(ApiResponse<AppointmentDto>.Ok(appointment, "Appointment cancelled successfully."));
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        await _appointmentUseCases.DeleteAsync(id);
        return Ok(ApiResponse.Ok("Appointment deleted successfully."));
    }
}
