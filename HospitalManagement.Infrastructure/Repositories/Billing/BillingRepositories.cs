using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Domain.Entities.Billing;
using HospitalManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Infrastructure.Repositories.Billing;

public class InvoiceRepository : IInvoiceRepository
{
    private readonly ApplicationDbContext _context;

    public InvoiceRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Invoice>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Invoices
            .Include(i => i.Patient)
            .Include(i => i.Items)
            .Include(i => i.Payments)
            .OrderByDescending(i => i.IssueDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<Invoice?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Invoices
            .Include(i => i.Patient)
            .Include(i => i.Items)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public async Task<Invoice?> GetByInvoiceNumberAsync(string invoiceNumber, CancellationToken cancellationToken = default)
    {
        return await _context.Invoices
            .Include(i => i.Patient)
            .Include(i => i.Items)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.InvoiceNumber.ToLower() == invoiceNumber.ToLower(), cancellationToken);
    }

    public async Task<IEnumerable<Invoice>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        return await _context.Invoices
            .Include(i => i.Patient)
            .Include(i => i.Items)
            .Include(i => i.Payments)
            .Where(i => i.PatientId == patientId)
            .OrderByDescending(i => i.IssueDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<Invoice> AddAsync(Invoice invoice, CancellationToken cancellationToken = default)
    {
        await _context.Invoices.AddAsync(invoice, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return invoice;
    }

    public async Task UpdateAsync(Invoice invoice, CancellationToken cancellationToken = default)
    {
        _context.Invoices.Update(invoice);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

public class PaymentRepository : IPaymentRepository
{
    private readonly ApplicationDbContext _context;

    public PaymentRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Payment>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Payments
            .Include(p => p.Invoice)
                .ThenInclude(inv => inv.Patient)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<Payment?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Payments
            .Include(p => p.Invoice)
                .ThenInclude(inv => inv.Patient)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Payment>> GetByInvoiceIdAsync(int invoiceId, CancellationToken cancellationToken = default)
    {
        return await _context.Payments
            .Include(p => p.Invoice)
            .Where(p => p.InvoiceId == invoiceId)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<Payment> AddAsync(Payment payment, CancellationToken cancellationToken = default)
    {
        await _context.Payments.AddAsync(payment, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return payment;
    }
}

public class InsuranceRepository : IInsuranceRepository
{
    private readonly ApplicationDbContext _context;

    public InsuranceRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Insurance>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Insurances
            .Include(i => i.Patient)
            .OrderBy(i => i.ProviderName)
            .ToListAsync(cancellationToken);
    }

    public async Task<Insurance?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Insurances
            .Include(i => i.Patient)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public async Task<Insurance?> GetActiveByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        return await _context.Insurances
            .Include(i => i.Patient)
            .Where(i => i.PatientId == patientId && i.IsActive && i.ExpiryDate > DateTime.UtcNow)
            .OrderByDescending(i => i.ExpiryDate)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Insurance> AddAsync(Insurance insurance, CancellationToken cancellationToken = default)
    {
        await _context.Insurances.AddAsync(insurance, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return insurance;
    }

    public async Task UpdateAsync(Insurance insurance, CancellationToken cancellationToken = default)
    {
        _context.Insurances.Update(insurance);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
