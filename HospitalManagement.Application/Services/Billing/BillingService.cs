using HospitalManagement.Application.DTOs.Billing;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Notifications;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Domain.Entities.Billing;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;

namespace HospitalManagement.Application.Services.Billing;

/// <summary>
/// Application Service for billing, invoicing, and insurance orchestration.
/// Coordinates persistence, external email notifications, and delegates financial invariants to the Domain model.
/// </summary>
public class BillingService : IBillingService
{
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IInsuranceRepository _insuranceRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly ICacheService _cacheService;
    private readonly IEmailService _emailService;

    public BillingService(
        IInvoiceRepository invoiceRepository,
        IPaymentRepository paymentRepository,
        IInsuranceRepository insuranceRepository,
        IPatientRepository patientRepository,
        ICacheService cacheService,
        IEmailService emailService)
    {
        _invoiceRepository = invoiceRepository;
        _paymentRepository = paymentRepository;
        _insuranceRepository = insuranceRepository;
        _patientRepository = patientRepository;
        _cacheService = cacheService;
        _emailService = emailService;
    }

    public async Task<IEnumerable<InsuranceDto>> GetAllInsurancesAsync(CancellationToken cancellationToken = default)
    {
        var list = await _insuranceRepository.GetAllAsync(cancellationToken);
        return list.Select(MapInsuranceToDto).ToList();
    }

    public async Task<InsuranceDto?> GetActiveInsuranceByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        var ins = await _insuranceRepository.GetActiveByPatientIdAsync(patientId, cancellationToken);
        return ins != null ? MapInsuranceToDto(ins) : null;
    }

    public async Task<InsuranceDto> CreateInsuranceAsync(CreateInsuranceDto dto, CancellationToken cancellationToken = default)
    {
        if (!await _patientRepository.ExistsAsync(dto.PatientId, cancellationToken))
            throw new NotFoundException("Patient", dto.PatientId);

        var insurance = Insurance.Create(
            dto.PatientId,
            dto.ProviderName,
            dto.PolicyNumber,
            dto.CoveragePercentage,
            dto.MaxCoverageAmount,
            dto.ExpiryDate);

        var created = await _insuranceRepository.AddAsync(insurance, cancellationToken);
        return MapInsuranceToDto(created);
    }

    public async Task<InsuranceDto> UpdateInsuranceAsync(int id, UpdateInsuranceDto dto, CancellationToken cancellationToken = default)
    {
        var ins = await _insuranceRepository.GetByIdAsync(id, cancellationToken);
        if (ins == null) throw new NotFoundException(nameof(Insurance), id);

        ins.UpdatePolicy(
            dto.ProviderName,
            dto.PolicyNumber,
            dto.CoveragePercentage,
            dto.MaxCoverageAmount,
            dto.ExpiryDate,
            dto.IsActive);

        await _insuranceRepository.UpdateAsync(ins, cancellationToken);
        return MapInsuranceToDto(ins);
    }

    public async Task<IEnumerable<InvoiceDto>> GetAllInvoicesAsync(CancellationToken cancellationToken = default)
    {
        var invoices = await _invoiceRepository.GetAllAsync(cancellationToken);
        return invoices.Select(MapInvoiceToDto).ToList();
    }

    public async Task<InvoiceDto> GetInvoiceByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var invoice = await _invoiceRepository.GetByIdAsync(id, cancellationToken);
        if (invoice == null) throw new NotFoundException(nameof(Invoice), id);
        return MapInvoiceToDto(invoice);
    }

    public async Task<IEnumerable<InvoiceDto>> GetInvoicesByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        if (!await _patientRepository.ExistsAsync(patientId, cancellationToken))
            throw new NotFoundException("Patient", patientId);

        var invoices = await _invoiceRepository.GetByPatientIdAsync(patientId, cancellationToken);
        return invoices.Select(MapInvoiceToDto).ToList();
    }

    public async Task<InvoiceDto> CreateInvoiceAsync(CreateInvoiceDto dto, CancellationToken cancellationToken = default)
    {
        var patient = await _patientRepository.GetByIdAsync(dto.PatientId, cancellationToken);
        if (patient == null) throw new NotFoundException("Patient", dto.PatientId);

        var invoiceItems = dto.Items.Select(item =>
            InvoiceItem.Create(item.Description, item.Quantity, item.UnitPrice)).ToList();

        decimal insuranceCoverage = 0m;
        if (dto.ApplyInsurance)
        {
            var activeInsurance = await _insuranceRepository.GetActiveByPatientIdAsync(dto.PatientId, cancellationToken);
            if (activeInsurance != null)
            {
                var rawSubTotal = invoiceItems.Sum(i => i.TotalPrice);
                insuranceCoverage = activeInsurance.CalculateCoverage(rawSubTotal, DateTime.UtcNow);
            }
        }

        var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";

        // Domain Aggregate Root enforces line items, tax math, discount invariants, total, balance, and initial status
        var invoice = Invoice.Create(
            invoiceNumber,
            dto.PatientId,
            dto.AppointmentId,
            invoiceItems,
            dto.TaxPercentage,
            dto.DiscountAmount,
            insuranceCoverage);

        var created = await _invoiceRepository.AddAsync(invoice, cancellationToken);
        created.Patient = patient;

        await _emailService.SendInvoiceCreatedAsync(new InvoiceNotificationDto(
            InvoiceId: created.Id,
            InvoiceNumber: created.InvoiceNumber,
            PatientName: $"{patient.FirstName} {patient.LastName}",
            PatientEmail: patient.Email,
            TotalAmount: created.TotalAmount,
            BalanceDue: created.BalanceDue,
            DueDate: created.DueDate
        ), cancellationToken);

        return MapInvoiceToDto(created);
    }

    public async Task<IEnumerable<PaymentDto>> GetPaymentsByInvoiceIdAsync(int invoiceId, CancellationToken cancellationToken = default)
    {
        var payments = await _paymentRepository.GetByInvoiceIdAsync(invoiceId, cancellationToken);
        return payments.Select(MapPaymentToDto).ToList();
    }

    public async Task<PaymentDto> RecordPaymentAsync(RecordPaymentDto dto, CancellationToken cancellationToken = default)
    {
        var invoice = await _invoiceRepository.GetByIdAsync(dto.InvoiceId, cancellationToken);
        if (invoice == null) throw new NotFoundException(nameof(Invoice), dto.InvoiceId);

        // Domain Aggregate Root enforces payment validation, balance deduction, and status transitions
        var payment = invoice.AddPayment(
            dto.Amount,
            dto.PaymentMethod,
            dto.TransactionReference,
            dto.Notes);

        await _invoiceRepository.UpdateAsync(invoice, cancellationToken);

        return new PaymentDto
        {
            Id = payment.Id,
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            PaymentDate = payment.PaymentDate,
            Amount = payment.Amount,
            PaymentMethod = payment.PaymentMethod,
            TransactionReference = payment.TransactionReference,
            Notes = payment.Notes
        };
    }

    private static InsuranceDto MapInsuranceToDto(Insurance i) => new()
    {
        Id = i.Id,
        PatientId = i.PatientId,
        PatientName = i.Patient != null ? $"{i.Patient.FirstName} {i.Patient.LastName}" : string.Empty,
        ProviderName = i.ProviderName,
        PolicyNumber = i.PolicyNumber,
        CoveragePercentage = i.CoveragePercentage,
        MaxCoverageAmount = i.MaxCoverageAmount,
        ExpiryDate = i.ExpiryDate,
        IsActive = i.IsActive
    };

    private static InvoiceDto MapInvoiceToDto(Invoice inv) => new()
    {
        Id = inv.Id,
        InvoiceNumber = inv.InvoiceNumber,
        PatientId = inv.PatientId,
        PatientName = inv.Patient != null ? $"{inv.Patient.FirstName} {inv.Patient.LastName}" : string.Empty,
        AppointmentId = inv.AppointmentId,
        IssueDate = inv.IssueDate,
        DueDate = inv.DueDate,
        SubTotal = inv.SubTotal,
        TaxAmount = inv.TaxAmount,
        DiscountAmount = inv.DiscountAmount,
        InsuranceCoverageAmount = inv.InsuranceCoverageAmount,
        TotalAmount = inv.TotalAmount,
        PaidAmount = inv.PaidAmount,
        BalanceDue = inv.BalanceDue,
        Status = inv.Status,
        Items = inv.Items.Select(item => new InvoiceItemDto
        {
            Id = item.Id,
            Description = item.Description,
            Quantity = item.Quantity,
            UnitPrice = item.UnitPrice,
            TotalPrice = item.TotalPrice
        }).ToList(),
        Payments = inv.Payments.Select(MapPaymentToDto).ToList()
    };

    private static PaymentDto MapPaymentToDto(Payment p) => new()
    {
        Id = p.Id,
        InvoiceId = p.InvoiceId,
        InvoiceNumber = p.Invoice?.InvoiceNumber ?? string.Empty,
        PaymentDate = p.PaymentDate,
        Amount = p.Amount,
        PaymentMethod = p.PaymentMethod,
        TransactionReference = p.TransactionReference,
        Notes = p.Notes
    };
}
