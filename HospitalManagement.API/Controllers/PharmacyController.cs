using FluentValidation;
using HospitalManagement.Application.DTOs.Common;
using HospitalManagement.Application.DTOs.Pharmacy;
using HospitalManagement.Application.Services.Pharmacy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalManagement.API.Controllers;

/// <summary>
/// Presentation Layer: Pharmacy Controller.
/// Manages Medicines, Stock Inventory, and Medication Dispensing.
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PharmacyController : ControllerBase
{
    private readonly IPharmacyService _pharmacyService;
    private readonly IValidator<CreateMedicineDto> _createMedicineValidator;
    private readonly IValidator<AddStockDto> _addStockValidator;
    private readonly IValidator<DispenseOrderRequestDto> _dispenseValidator;

    public PharmacyController(
        IPharmacyService pharmacyService,
        IValidator<CreateMedicineDto> createMedicineValidator,
        IValidator<AddStockDto> addStockValidator,
        IValidator<DispenseOrderRequestDto> dispenseValidator)
    {
        _pharmacyService = pharmacyService;
        _createMedicineValidator = createMedicineValidator;
        _addStockValidator = addStockValidator;
        _dispenseValidator = dispenseValidator;
    }

    // --- Medicines ---

    [HttpGet("medicines")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<MedicineDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllMedicines()
    {
        var medicines = await _pharmacyService.GetAllMedicinesAsync();
        return Ok(ApiResponse<IEnumerable<MedicineDto>>.Ok(medicines));
    }

    [HttpGet("medicines/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<MedicineDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMedicineById(int id)
    {
        var medicine = await _pharmacyService.GetMedicineByIdAsync(id);
        return Ok(ApiResponse<MedicineDto>.Ok(medicine));
    }

    [HttpPost("medicines")]
    [ProducesResponseType(typeof(ApiResponse<MedicineDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateMedicine([FromBody] CreateMedicineDto dto)
    {
        var validation = await _createMedicineValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new ValidationException(validation.Errors);

        var created = await _pharmacyService.CreateMedicineAsync(dto);
        return CreatedAtAction(nameof(GetMedicineById), new { id = created.Id }, ApiResponse<MedicineDto>.Ok(created, "Medicine created successfully."));
    }

    [HttpPut("medicines/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<MedicineDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateMedicine(int id, [FromBody] UpdateMedicineDto dto)
    {
        var updated = await _pharmacyService.UpdateMedicineAsync(id, dto);
        return Ok(ApiResponse<MedicineDto>.Ok(updated, "Medicine updated successfully."));
    }

    [HttpDelete("medicines/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMedicine(int id)
    {
        await _pharmacyService.DeleteMedicineAsync(id);
        return Ok(ApiResponse.Ok("Medicine deleted successfully."));
    }

    // --- Stocks ---

    [HttpGet("stocks")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<StockDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllStocks()
    {
        var stocks = await _pharmacyService.GetAllStocksAsync();
        return Ok(ApiResponse<IEnumerable<StockDto>>.Ok(stocks));
    }

    [HttpGet("stocks/medicine/{medicineId:int}")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<StockDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStocksByMedicineId(int medicineId)
    {
        var stocks = await _pharmacyService.GetStocksByMedicineIdAsync(medicineId);
        return Ok(ApiResponse<IEnumerable<StockDto>>.Ok(stocks));
    }

    [HttpPost("stocks")]
    [ProducesResponseType(typeof(ApiResponse<StockDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddStock([FromBody] AddStockDto dto)
    {
        var validation = await _addStockValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new ValidationException(validation.Errors);

        var created = await _pharmacyService.AddStockAsync(dto);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<StockDto>.Ok(created, "Stock added successfully."));
    }

    [HttpPut("stocks/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<StockDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateStockDto dto)
    {
        var updated = await _pharmacyService.UpdateStockAsync(id, dto);
        return Ok(ApiResponse<StockDto>.Ok(updated, "Stock updated successfully."));
    }

    // --- Dispensing ---

    [HttpGet("dispense")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<DispensingOrderDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllDispensingOrders()
    {
        var orders = await _pharmacyService.GetAllDispensingOrdersAsync();
        return Ok(ApiResponse<IEnumerable<DispensingOrderDto>>.Ok(orders));
    }

    [HttpGet("dispense/{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<DispensingOrderDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDispensingOrderById(int id)
    {
        var order = await _pharmacyService.GetDispensingOrderByIdAsync(id);
        return Ok(ApiResponse<DispensingOrderDto>.Ok(order));
    }

    [HttpPost("dispense")]
    [ProducesResponseType(typeof(ApiResponse<DispensingOrderDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DispenseOrder([FromBody] DispenseOrderRequestDto dto)
    {
        var validation = await _dispenseValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new ValidationException(validation.Errors);

        var dispensed = await _pharmacyService.DispenseOrderAsync(dto);
        return CreatedAtAction(nameof(GetDispensingOrderById), new { id = dispensed.Id }, ApiResponse<DispensingOrderDto>.Ok(dispensed, "Medications dispensed successfully."));
    }
}
