using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;

namespace HospitalManagement.Domain.Entities.Billing;

public class Insurance
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public string ProviderName { get; set; } = string.Empty;
    public string PolicyNumber { get; set; } = string.Empty;
    public decimal CoveragePercentage { get; set; } = 80m; // e.g. 80%
    public decimal MaxCoverageAmount { get; set; } = 5000m;
    public DateTime ExpiryDate { get; set; }
    public bool IsActive { get; set; } = true;

    public Patient? Patient { get; set; }
}

public class Invoice
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int PatientId { get; set; }
    public int? AppointmentId { get; set; }
    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30);
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal InsuranceCoverageAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceDue { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Pending;

    public Patient? Patient { get; set; }
    public Appointment? Appointment { get; set; }
    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class InvoiceItem
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }

    public Invoice? Invoice { get; set; }
}

public class Payment
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; }

    public Invoice? Invoice { get; set; }
}
