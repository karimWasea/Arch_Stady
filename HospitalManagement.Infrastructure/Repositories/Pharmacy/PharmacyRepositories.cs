using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Domain.Entities.Pharmacy;
using HospitalManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Infrastructure.Repositories.Pharmacy;

public class MedicineRepository : IMedicineRepository
{
    private readonly ApplicationDbContext _context;

    public MedicineRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Medicine>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Medicines
            .Include(m => m.Stocks)
            .OrderBy(m => m.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Medicine?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Medicines
            .Include(m => m.Stocks)
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
    }

    public async Task<Medicine?> GetBySkuAsync(string sku, CancellationToken cancellationToken = default)
    {
        return await _context.Medicines
            .Include(m => m.Stocks)
            .FirstOrDefaultAsync(m => m.Sku.ToLower() == sku.ToLower(), cancellationToken);
    }

    public async Task<Medicine> AddAsync(Medicine medicine, CancellationToken cancellationToken = default)
    {
        await _context.Medicines.AddAsync(medicine, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return medicine;
    }

    public async Task UpdateAsync(Medicine medicine, CancellationToken cancellationToken = default)
    {
        _context.Medicines.Update(medicine);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Medicine medicine, CancellationToken cancellationToken = default)
    {
        _context.Medicines.Remove(medicine);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

public class StockRepository : IStockRepository
{
    private readonly ApplicationDbContext _context;

    public StockRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Stock>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Stocks
            .Include(s => s.Medicine)
            .OrderBy(s => s.ExpiryDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Stock>> GetByMedicineIdAsync(int medicineId, CancellationToken cancellationToken = default)
    {
        return await _context.Stocks
            .Include(s => s.Medicine)
            .Where(s => s.MedicineId == medicineId)
            .OrderBy(s => s.ExpiryDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<Stock?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Stocks
            .Include(s => s.Medicine)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<Stock> AddAsync(Stock stock, CancellationToken cancellationToken = default)
    {
        await _context.Stocks.AddAsync(stock, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return stock;
    }

    public async Task UpdateAsync(Stock stock, CancellationToken cancellationToken = default)
    {
        _context.Stocks.Update(stock);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> GetTotalStockQuantityAsync(int medicineId, CancellationToken cancellationToken = default)
    {
        return await _context.Stocks
            .Where(s => s.MedicineId == medicineId && s.ExpiryDate > DateTime.UtcNow)
            .SumAsync(s => s.QuantityInStock, cancellationToken);
    }

    public async Task DeductStockQuantityAsync(int medicineId, int quantity, CancellationToken cancellationToken = default)
    {
        var stocks = await _context.Stocks
            .Where(s => s.MedicineId == medicineId && s.QuantityInStock > 0 && s.ExpiryDate > DateTime.UtcNow)
            .OrderBy(s => s.ExpiryDate)
            .ToListAsync(cancellationToken);

        int remainingToDeduct = quantity;

        foreach (var stock in stocks)
        {
            if (remainingToDeduct <= 0) break;

            int deductFromThisBatch = Math.Min(stock.QuantityInStock, remainingToDeduct);
            if (deductFromThisBatch > 0)
            {
                stock.DeductQuantity(deductFromThisBatch);
                remainingToDeduct -= deductFromThisBatch;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}

public class DispensingRepository : IDispensingRepository
{
    private readonly ApplicationDbContext _context;

    public DispensingRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<DispensingOrder>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.DispensingOrders
            .Include(d => d.Patient)
            .Include(d => d.Items)
                .ThenInclude(i => i.Medicine)
            .OrderByDescending(d => d.DispensedDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<DispensingOrder?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.DispensingOrders
            .Include(d => d.Patient)
            .Include(d => d.Items)
                .ThenInclude(i => i.Medicine)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<DispensingOrder>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        return await _context.DispensingOrders
            .Include(d => d.Patient)
            .Include(d => d.Items)
                .ThenInclude(i => i.Medicine)
            .Where(d => d.PatientId == patientId)
            .OrderByDescending(d => d.DispensedDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<DispensingOrder> AddAsync(DispensingOrder order, CancellationToken cancellationToken = default)
    {
        await _context.DispensingOrders.AddAsync(order, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return order;
    }

    public async Task UpdateAsync(DispensingOrder order, CancellationToken cancellationToken = default)
    {
        _context.DispensingOrders.Update(order);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
