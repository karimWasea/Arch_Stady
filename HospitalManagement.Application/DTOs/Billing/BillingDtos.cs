using HospitalManagement.Domain.Enums;

namespace HospitalManagement.Application.DTOs.Billing;

// --- Insurance ---
public class InsuranceDto
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string ProviderName { get; set; } = string.Empty;
    public string PolicyNumber { get; set; } = string.Empty;
    public decimal CoveragePercentage { get; set; }
    public decimal MaxCoverageAmount { get; set; }
    public DateTime ExpiryDate { get; set; }
    public bool IsActive { get; set; }
}

public class CreateInsuranceDto
{
    public int PatientId { get; set; }
    public string ProviderName { get; set; } = string.Empty;
    public string PolicyNumber { get; set; } = string.Empty;
    public decimal CoveragePercentage { get; set; } = 80m;
    public decimal MaxCoverageAmount { get; set; } = 5000m;
    public DateTime ExpiryDate { get; set; }
}

public class UpdateInsuranceDto : CreateInsuranceDto
{
    public bool IsActive { get; set; } = true;
}

// --- Invoice ---
public class InvoiceItemDto
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}

public class CreateInvoiceItemDto
{
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
}

public class InvoiceDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int? AppointmentId { get; set; }
    public DateTime IssueDate { get; set; }
    public DateTime DueDate { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal InsuranceCoverageAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceDue { get; set; }
    public InvoiceStatus Status { get; set; }
    public string StatusName => Status.ToString();
    public List<InvoiceItemDto> Items { get; set; } = new();
    public List<PaymentDto> Payments { get; set; } = new();
}

public class CreateInvoiceDto
{
    public int PatientId { get; set; }
    public int? AppointmentId { get; set; }
    public decimal TaxPercentage { get; set; } = 5.0m;
    public decimal DiscountAmount { get; set; } = 0m;
    public bool ApplyInsurance { get; set; } = true;
    public List<CreateInvoiceItemDto> Items { get; set; } = new();
}

// --- Payment ---
public class PaymentDto
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string PaymentMethodName => PaymentMethod.ToString();
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; }
}

public class RecordPaymentDto
{
    public int InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; }
}
