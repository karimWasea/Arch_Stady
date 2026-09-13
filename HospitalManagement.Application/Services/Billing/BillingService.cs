using HospitalManagement.Application.DTOs.Billing;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Notifications;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Entities.Billing;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;

namespace HospitalManagement.Application.Services.Billing;

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

        var insurance = new Insurance
        {
            PatientId = dto.PatientId,
            ProviderName = dto.ProviderName,
            PolicyNumber = dto.PolicyNumber,
            CoveragePercentage = dto.CoveragePercentage,
            MaxCoverageAmount = dto.MaxCoverageAmount,
            ExpiryDate = dto.ExpiryDate,
            IsActive = true
        };

        var created = await _insuranceRepository.AddAsync(insurance, cancellationToken);
        return MapInsuranceToDto(created);
    }

    public async Task<InsuranceDto> UpdateInsuranceAsync(int id, UpdateInsuranceDto dto, CancellationToken cancellationToken = default)
    {
        var ins = await _insuranceRepository.GetByIdAsync(id, cancellationToken);
        if (ins == null) throw new NotFoundException(nameof(Insurance), id);

        ins.ProviderName = dto.ProviderName;
        ins.PolicyNumber = dto.PolicyNumber;
        ins.CoveragePercentage = dto.CoveragePercentage;
        ins.MaxCoverageAmount = dto.MaxCoverageAmount;
        ins.ExpiryDate = dto.ExpiryDate;
        ins.IsActive = dto.IsActive;

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

        if (dto.Items == null || !dto.Items.Any())
            throw new BusinessRuleException("An invoice must contain at least one line item.");

        decimal subTotal = 0m;
        var invoiceItems = new List<InvoiceItem>();

        foreach (var item in dto.Items)
        {
            var total = item.UnitPrice * item.Quantity;
            subTotal += total;
            invoiceItems.Add(new InvoiceItem
            {
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                TotalPrice = total
            });
        }

        var taxAmount = subTotal * (dto.TaxPercentage / 100m);
        var discountAmount = dto.DiscountAmount;

        decimal insuranceCoverage = 0m;
        if (dto.ApplyInsurance)
        {
            var activeInsurance = await _insuranceRepository.GetActiveByPatientIdAsync(dto.PatientId, cancellationToken);
            if (activeInsurance != null)
            {
                var calculatedCoverage = subTotal * (activeInsurance.CoveragePercentage / 100m);
                insuranceCoverage = Math.Min(calculatedCoverage, activeInsurance.MaxCoverageAmount);
            }
        }

        var totalAmount = Math.Max(0m, (subTotal + taxAmount) - discountAmount - insuranceCoverage);
        var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            PatientId = dto.PatientId,
            AppointmentId = dto.AppointmentId,
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            SubTotal = subTotal,
            TaxAmount = taxAmount,
            DiscountAmount = discountAmount,
            InsuranceCoverageAmount = insuranceCoverage,
            TotalAmount = totalAmount,
            PaidAmount = 0m,
            BalanceDue = totalAmount,
            Status = totalAmount == 0m ? InvoiceStatus.Paid : InvoiceStatus.Pending,
            Items = invoiceItems
        };

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

        if (invoice.Status == InvoiceStatus.Paid || invoice.BalanceDue <= 0m)
            throw new BusinessRuleException("This invoice has already been fully paid.");

        if (dto.Amount <= 0m)
            throw new BusinessRuleException("Payment amount must be greater than zero.");

        if (dto.Amount > invoice.BalanceDue)
            throw new BusinessRuleException($"Payment amount ({dto.Amount:C}) exceeds balance due ({invoice.BalanceDue:C}).");

        var payment = new Payment
        {
            InvoiceId = dto.InvoiceId,
            PaymentDate = DateTime.UtcNow,
            Amount = dto.Amount,
            PaymentMethod = dto.PaymentMethod,
            TransactionReference = dto.TransactionReference ?? $"TXN-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            Notes = dto.Notes
        };

        var created = await _paymentRepository.AddAsync(payment, cancellationToken);

        // Update Invoice status & balances
        invoice.PaidAmount += dto.Amount;
        invoice.BalanceDue -= dto.Amount;

        if (invoice.BalanceDue <= 0m)
        {
            invoice.Status = InvoiceStatus.Paid;
        }
        else
        {
            invoice.Status = InvoiceStatus.PartiallyPaid;
        }

        await _invoiceRepository.UpdateAsync(invoice, cancellationToken);

        return new PaymentDto
        {
            Id = created.Id,
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            PaymentDate = created.PaymentDate,
            Amount = created.Amount,
            PaymentMethod = created.PaymentMethod,
            TransactionReference = created.TransactionReference,
            Notes = created.Notes
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
