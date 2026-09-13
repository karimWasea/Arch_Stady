using FluentValidation;
using HospitalManagement.Application.DTOs.Billing;
using HospitalManagement.Application.DTOs.Common;
using HospitalManagement.Application.Services.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.API.Controllers;

/// <summary>
/// Presentation Layer: Billing Controller.
/// Manages Insurance Policies, Invoices, Service Charges, and Payment Transactions.
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class BillingController : ControllerBase
{
    private readonly IBillingService _billingService;
    private readonly IValidator<CreateInsuranceDto> _createInsuranceValidator;
    private readonly IValidator<CreateInvoiceDto> _createInvoiceValidator;
    private readonly IValidator<RecordPaymentDto> _recordPaymentValidator;

    public BillingController(
        IBillingService billingService,
        IValidator<CreateInsuranceDto> createInsuranceValidator,
        IValidator<CreateInvoiceDto> createInvoiceValidator,
        IValidator<RecordPaymentDto> recordPaymentValidator)
    {
        _billingService = billingService;
        _createInsuranceValidator = createInsuranceValidator;
        _createInvoiceValidator = createInvoiceValidator;
        _recordPaymentValidator = recordPaymentValidator;
    }

    // --- Insurance ---

    [HttpGet("insurance")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<InsuranceDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllInsurances()
    {
        var insurances = await _billingService.GetAllInsurancesAsync();
        return Ok(ApiResponse<IEnumerable<InsuranceDto>>.Ok(insurances));
    }

    [HttpGet("insurance/patient/{patientId:int}")]
    [ProducesResponseType(typeof(ApiResponse<InsuranceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetActiveInsuranceByPatientId(int patientId)
    {
        var insurance = await _billingService.GetActiveInsuranceByPatientIdAsync(patientId);
        if (insurance == null) return NotFound(ApiResponse.Fail($"No active insurance policy found for patient #{patientId}."));
        return Ok(ApiResponse<InsuranceDto>.Ok(insurance));
    }

    [HttpPost("insurance")]
    [ProducesResponseType(typeof(ApiResponse<InsuranceDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateInsurance([FromBody] CreateInsuranceDto dto)
    {
        var validation = await _createInsuranceValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new ValidationException(validation.Errors);

        var created = await _billingService.CreateInsuranceAsync(dto);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<InsuranceDto>.Ok(created, "Insurance policy created successfully."));
    }

    [HttpPut("insurance/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<InsuranceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateInsurance(int id, [FromBody] UpdateInsuranceDto dto)
    {
        var updated = await _billingService.UpdateInsuranceAsync(id, dto);
        return Ok(ApiResponse<InsuranceDto>.Ok(updated, "Insurance policy updated successfully."));
    }

    // --- Invoices ---

    [HttpGet("invoices")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<InvoiceDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllInvoices()
    {
        var invoices = await _billingService.GetAllInvoicesAsync();
        return Ok(ApiResponse<IEnumerable<InvoiceDto>>.Ok(invoices));
    }

    [HttpGet("invoices/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<InvoiceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInvoiceById(int id)
    {
        var invoice = await _billingService.GetInvoiceByIdAsync(id);
        return Ok(ApiResponse<InvoiceDto>.Ok(invoice));
    }

    [HttpGet("invoices/patient/{patientId:int}")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<InvoiceDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInvoicesByPatientId(int patientId)
    {
        var invoices = await _billingService.GetInvoicesByPatientIdAsync(patientId);
        return Ok(ApiResponse<IEnumerable<InvoiceDto>>.Ok(invoices));
    }

    [HttpPost("invoices")]
    [ProducesResponseType(typeof(ApiResponse<InvoiceDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceDto dto)
    {
        var validation = await _createInvoiceValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new ValidationException(validation.Errors);

        var created = await _billingService.CreateInvoiceAsync(dto);
        return CreatedAtAction(nameof(GetInvoiceById), new { id = created.Id }, ApiResponse<InvoiceDto>.Ok(created, "Invoice created successfully."));
    }

    // --- Payments ---

    [HttpGet("payments/invoice/{invoiceId:int}")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<PaymentDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaymentsByInvoiceId(int invoiceId)
    {
        var payments = await _billingService.GetPaymentsByInvoiceIdAsync(invoiceId);
        return Ok(ApiResponse<IEnumerable<PaymentDto>>.Ok(payments));
    }

    [HttpPost("payments")]
    [ProducesResponseType(typeof(ApiResponse<PaymentDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordPayment([FromBody] RecordPaymentDto dto)
    {
        var validation = await _recordPaymentValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new ValidationException(validation.Errors);

        var recorded = await _billingService.RecordPaymentAsync(dto);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<PaymentDto>.Ok(recorded, "Payment recorded successfully."));
    }
}
