using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Domain.Entities.Laboratory;
using HospitalManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Infrastructure.Repositories.Laboratory;

public class LabTestRepository : ILabTestRepository
{
    private readonly ApplicationDbContext _context;

    public LabTestRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<LabTest>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.LabTests
            .OrderBy(t => t.Category)
            .ThenBy(t => t.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<LabTest?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.LabTests
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
    }

    public async Task<LabTest?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        return await _context.LabTests
            .FirstOrDefaultAsync(t => t.Code.ToLower() == code.ToLower(), cancellationToken);
    }

    public async Task<LabTest> AddAsync(LabTest test, CancellationToken cancellationToken = default)
    {
        await _context.LabTests.AddAsync(test, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return test;
    }

    public async Task UpdateAsync(LabTest test, CancellationToken cancellationToken = default)
    {
        _context.LabTests.Update(test);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(LabTest test, CancellationToken cancellationToken = default)
    {
        _context.LabTests.Remove(test);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

public class LabOrderRepository : ILabOrderRepository
{
    private readonly ApplicationDbContext _context;

    public LabOrderRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<LabOrder>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.LabOrders
            .Include(o => o.Patient)
            .Include(o => o.Doctor)
            .Include(o => o.Items)
                .ThenInclude(i => i.LabTest)
            .Include(o => o.Results)
                .ThenInclude(r => r.LabTest)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<LabOrder?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.LabOrders
            .Include(o => o.Patient)
            .Include(o => o.Doctor)
            .Include(o => o.Items)
                .ThenInclude(i => i.LabTest)
            .Include(o => o.Results)
                .ThenInclude(r => r.LabTest)
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<LabOrder>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        return await _context.LabOrders
            .Include(o => o.Patient)
            .Include(o => o.Doctor)
            .Include(o => o.Items)
                .ThenInclude(i => i.LabTest)
            .Include(o => o.Results)
                .ThenInclude(r => r.LabTest)
            .Where(o => o.PatientId == patientId)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<LabOrder> AddAsync(LabOrder order, CancellationToken cancellationToken = default)
    {
        await _context.LabOrders.AddAsync(order, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return order;
    }

    public async Task UpdateAsync(LabOrder order, CancellationToken cancellationToken = default)
    {
        _context.LabOrders.Update(order);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

public class LabResultRepository : ILabResultRepository
{
    private readonly ApplicationDbContext _context;

    public LabResultRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<LabResult>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.LabResults
            .Include(r => r.LabTest)
            .Include(r => r.LabOrder)
            .OrderByDescending(r => r.PerformedDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<LabResult>> GetByOrderIdAsync(int orderId, CancellationToken cancellationToken = default)
    {
        return await _context.LabResults
            .Include(r => r.LabTest)
            .Where(r => r.LabOrderId == orderId)
            .OrderByDescending(r => r.PerformedDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<LabResult?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.LabResults
            .Include(r => r.LabTest)
            .Include(r => r.LabOrder)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<LabResult> AddAsync(LabResult result, CancellationToken cancellationToken = default)
    {
        await _context.LabResults.AddAsync(result, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return result;
    }

    public async Task UpdateAsync(LabResult result, CancellationToken cancellationToken = default)
    {
        _context.LabResults.Update(result);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
