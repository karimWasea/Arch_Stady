using HospitalManagement.Application.DTOs.Billing;

namespace HospitalManagement.Application.Services.Billing;

public interface IBillingService
{
    Task<IEnumerable<InsuranceDto>> GetAllInsurancesAsync(CancellationToken cancellationToken = default);
    Task<InsuranceDto?> GetActiveInsuranceByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<InsuranceDto> CreateInsuranceAsync(CreateInsuranceDto dto, CancellationToken cancellationToken = default);
    Task<InsuranceDto> UpdateInsuranceAsync(int id, UpdateInsuranceDto dto, CancellationToken cancellationToken = default);

    Task<IEnumerable<InvoiceDto>> GetAllInvoicesAsync(CancellationToken cancellationToken = default);
    Task<InvoiceDto> GetInvoiceByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<InvoiceDto>> GetInvoicesByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<InvoiceDto> CreateInvoiceAsync(CreateInvoiceDto dto, CancellationToken cancellationToken = default);

    Task<IEnumerable<PaymentDto>> GetPaymentsByInvoiceIdAsync(int invoiceId, CancellationToken cancellationToken = default);
    Task<PaymentDto> RecordPaymentAsync(RecordPaymentDto dto, CancellationToken cancellationToken = default);
}
