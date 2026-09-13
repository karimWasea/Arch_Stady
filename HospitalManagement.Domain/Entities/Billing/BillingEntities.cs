using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;

namespace HospitalManagement.Domain.Entities.Billing;

/// <summary>
/// Domain Entity / Aggregate Root representing an insurance coverage policy.
/// Enforces business rules for coverage caps and eligibility calculation.
/// </summary>
public class Insurance
{
    public int Id { get; private set; }
    public int PatientId { get; private set; }
    public string ProviderName { get; private set; } = string.Empty;
    public string PolicyNumber { get; private set; } = string.Empty;
    public decimal CoveragePercentage { get; private set; } = 80m;
    public decimal MaxCoverageAmount { get; private set; } = 5000m;
    public DateTime ExpiryDate { get; private set; }
    public bool IsActive { get; private set; } = true;

    public Patient? Patient { get; set; }

    // Parameterless constructor for EF Core
    protected Insurance() { }

    public static Insurance Create(
        int patientId,
        string providerName,
        string policyNumber,
        decimal coveragePercentage,
        decimal maxCoverageAmount,
        DateTime expiryDate)
    {
        if (patientId <= 0)
            throw new BusinessRuleException("Patient ID must be greater than zero.");

        if (string.IsNullOrWhiteSpace(providerName))
            throw new BusinessRuleException("Insurance provider name cannot be empty.");

        if (string.IsNullOrWhiteSpace(policyNumber))
            throw new BusinessRuleException("Policy number cannot be empty.");

        if (coveragePercentage < 0m || coveragePercentage > 100m)
            throw new BusinessRuleException("Coverage percentage must be between 0 and 100.");

        if (maxCoverageAmount < 0m)
            throw new BusinessRuleException("Max coverage amount cannot be negative.");

        return new Insurance
        {
            PatientId = patientId,
            ProviderName = providerName.Trim(),
            PolicyNumber = policyNumber.Trim(),
            CoveragePercentage = coveragePercentage,
            MaxCoverageAmount = maxCoverageAmount,
            ExpiryDate = expiryDate,
            IsActive = true
        };
    }

    public void UpdatePolicy(
        string providerName,
        string policyNumber,
        decimal coveragePercentage,
        decimal maxCoverageAmount,
        DateTime expiryDate,
        bool isActive)
    {
        if (string.IsNullOrWhiteSpace(providerName))
            throw new BusinessRuleException("Insurance provider name cannot be empty.");

        if (string.IsNullOrWhiteSpace(policyNumber))
            throw new BusinessRuleException("Policy number cannot be empty.");

        if (coveragePercentage < 0m || coveragePercentage > 100m)
            throw new BusinessRuleException("Coverage percentage must be between 0 and 100.");

        if (maxCoverageAmount < 0m)
            throw new BusinessRuleException("Max coverage amount cannot be negative.");

        ProviderName = providerName.Trim();
        PolicyNumber = policyNumber.Trim();
        CoveragePercentage = coveragePercentage;
        MaxCoverageAmount = maxCoverageAmount;
        ExpiryDate = expiryDate;
        IsActive = isActive;
    }

    public bool IsEligible(DateTime? onDate = null) => IsActive && ExpiryDate >= (onDate ?? DateTime.UtcNow);

    public decimal CalculateCoverage(decimal amount, DateTime? onDate = null)
    {
        if (!IsEligible(onDate) || amount <= 0m)
            return 0m;

        var calculated = amount * (CoveragePercentage / 100m);
        return Math.Min(calculated, MaxCoverageAmount);
    }
}

/// <summary>
/// Domain Aggregate Root for medical billing invoices.
/// Protects financial invariants, balance reconciliation, and payment lifecycle state transitions.
/// </summary>
public class Invoice
{
    public int Id { get; private set; }
    public string InvoiceNumber { get; private set; } = string.Empty;
    public int PatientId { get; private set; }
    public int? AppointmentId { get; private set; }
    public DateTime IssueDate { get; private set; } = DateTime.UtcNow;
    public DateTime DueDate { get; private set; } = DateTime.UtcNow.AddDays(30);
    public decimal SubTotal { get; private set; }
    public decimal TaxAmount { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal InsuranceCoverageAmount { get; private set; }
    public decimal TotalAmount { get; private set; }
    public decimal PaidAmount { get; private set; }
    public decimal BalanceDue { get; private set; }
    public InvoiceStatus Status { get; private set; } = InvoiceStatus.Pending;

    public Patient? Patient { get; set; }
    public Appointment? Appointment { get; set; }

    private readonly List<InvoiceItem> _items = new();
    public IReadOnlyCollection<InvoiceItem> Items => _items.AsReadOnly();

    private readonly List<Payment> _payments = new();
    public IReadOnlyCollection<Payment> Payments => _payments.AsReadOnly();

    // Parameterless constructor for EF Core
    protected Invoice() { }

    public static Invoice Create(
        string invoiceNumber,
        int patientId,
        int? appointmentId,
        IEnumerable<InvoiceItem> items,
        decimal taxPercentage,
        decimal discountAmount,
        decimal insuranceCoverage,
        DateTime? issueDate = null,
        DateTime? dueDate = null)
    {
        if (string.IsNullOrWhiteSpace(invoiceNumber))
            throw new BusinessRuleException("Invoice number cannot be empty.");

        if (patientId <= 0)
            throw new BusinessRuleException("Patient ID must be greater than zero.");

        var itemList = items?.ToList() ?? new List<InvoiceItem>();
        if (itemList.Count == 0)
            throw new BusinessRuleException("An invoice must contain at least one line item.");

        if (taxPercentage < 0m)
            throw new BusinessRuleException("Tax percentage cannot be negative.");

        if (discountAmount < 0m)
            throw new BusinessRuleException("Discount amount cannot be negative.");

        if (insuranceCoverage < 0m)
            throw new BusinessRuleException("Insurance coverage cannot be negative.");

        var subTotal = itemList.Sum(i => i.TotalPrice);
        var taxAmount = subTotal * (taxPercentage / 100m);
        var grossAmount = subTotal + taxAmount;

        if (discountAmount > grossAmount)
            throw new BusinessRuleException("Discount amount cannot exceed gross invoice amount (SubTotal + Tax).");

        var totalAmount = Math.Max(0m, grossAmount - discountAmount - insuranceCoverage);

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber.Trim(),
            PatientId = patientId,
            AppointmentId = appointmentId,
            IssueDate = issueDate ?? DateTime.UtcNow,
            DueDate = dueDate ?? DateTime.UtcNow.AddDays(30),
            SubTotal = subTotal,
            TaxAmount = taxAmount,
            DiscountAmount = discountAmount,
            InsuranceCoverageAmount = insuranceCoverage,
            TotalAmount = totalAmount,
            PaidAmount = 0m,
            BalanceDue = totalAmount,
            Status = totalAmount == 0m ? InvoiceStatus.Paid : InvoiceStatus.Pending
        };

        invoice._items.AddRange(itemList);
        return invoice;
    }

    public Payment AddPayment(
        decimal amount,
        PaymentMethod paymentMethod,
        string? transactionReference = null,
        string? notes = null,
        DateTime? paymentDate = null)
    {
        if (Status == InvoiceStatus.Paid || BalanceDue <= 0m)
            throw new BusinessRuleException("This invoice has already been fully paid.");

        if (Status == InvoiceStatus.Cancelled)
            throw new BusinessRuleException("Cannot add payment to a cancelled invoice.");

        if (amount <= 0m)
            throw new BusinessRuleException("Payment amount must be greater than zero.");

        if (amount > BalanceDue)
            throw new BusinessRuleException($"Payment amount ({amount:C}) exceeds balance due ({BalanceDue:C}).");

        var payment = Payment.Create(
            Id,
            amount,
            paymentMethod,
            transactionReference ?? $"TXN-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            notes,
            paymentDate);

        _payments.Add(payment);

        PaidAmount += amount;
        BalanceDue -= amount;

        Status = BalanceDue <= 0m ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        return payment;
    }

    public void Cancel()
    {
        if (Status == InvoiceStatus.Paid)
            throw new BusinessRuleException("Cannot cancel an invoice that has already been fully paid.");

        Status = InvoiceStatus.Cancelled;
    }
}

/// <summary>
/// Child entity within the Invoice aggregate.
/// Represents a billable hospital charge line item.
/// </summary>
public class InvoiceItem
{
    public int Id { get; private set; }
    public int InvoiceId { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public int Quantity { get; private set; } = 1;
    public decimal UnitPrice { get; private set; }
    public decimal TotalPrice { get; private set; }

    public Invoice? Invoice { get; set; }

    protected InvoiceItem() { }

    public static InvoiceItem Create(string description, int quantity, decimal unitPrice)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new BusinessRuleException("Invoice line item description cannot be empty.");

        if (quantity <= 0)
            throw new BusinessRuleException("Invoice line item quantity must be greater than zero.");

        if (unitPrice < 0m)
            throw new BusinessRuleException("Invoice line item unit price cannot be negative.");

        return new InvoiceItem
        {
            Description = description.Trim(),
            Quantity = quantity,
            UnitPrice = unitPrice,
            TotalPrice = quantity * unitPrice
        };
    }
}

/// <summary>
/// Child entity within the Invoice aggregate.
/// Represents a monetary payment transaction applied toward an invoice.
/// </summary>
public class Payment
{
    public int Id { get; private set; }
    public int InvoiceId { get; private set; }
    public DateTime PaymentDate { get; private set; } = DateTime.UtcNow;
    public decimal Amount { get; private set; }
    public PaymentMethod PaymentMethod { get; private set; } = PaymentMethod.Cash;
    public string? TransactionReference { get; private set; }
    public string? Notes { get; private set; }

    public Invoice? Invoice { get; set; }

    protected Payment() { }

    public static Payment Create(
        int invoiceId,
        decimal amount,
        PaymentMethod paymentMethod,
        string? transactionReference = null,
        string? notes = null,
        DateTime? paymentDate = null)
    {
        if (amount <= 0m)
            throw new BusinessRuleException("Payment amount must be greater than zero.");

        return new Payment
        {
            InvoiceId = invoiceId,
            Amount = amount,
            PaymentMethod = paymentMethod,
            TransactionReference = transactionReference,
            Notes = notes,
            PaymentDate = paymentDate ?? DateTime.UtcNow
        };
    }
}
