using HospitalManagement.Domain.Entities.Billing;

namespace HospitalManagement.Application.Interfaces.Repositories;

public interface IInvoiceRepository
{
    Task<IEnumerable<Invoice>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Invoice?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Invoice?> GetByInvoiceNumberAsync(string invoiceNumber, CancellationToken cancellationToken = default);
    Task<IEnumerable<Invoice>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<Invoice> AddAsync(Invoice invoice, CancellationToken cancellationToken = default);
    Task UpdateAsync(Invoice invoice, CancellationToken cancellationToken = default);
}

public interface IPaymentRepository
{
    Task<IEnumerable<Payment>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Payment?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Payment>> GetByInvoiceIdAsync(int invoiceId, CancellationToken cancellationToken = default);
    Task<Payment> AddAsync(Payment payment, CancellationToken cancellationToken = default);
}

public interface IInsuranceRepository
{
    Task<IEnumerable<Insurance>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Insurance?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Insurance?> GetActiveByPatientIdAsync(int patientId, CancellationToken cancellationToken = default);
    Task<Insurance> AddAsync(Insurance insurance, CancellationToken cancellationToken = default);
    Task UpdateAsync(Insurance insurance, CancellationToken cancellationToken = default);
}
