using HospitalManagement.Adapters.Persistence.Context;
using HospitalManagement.Core.Domain;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Adapters.Persistence.Repositories;

public class SqlPrescriptionRepository : IPrescriptionRepository
{
    private readonly ApplicationDbContext _context;

    public SqlPrescriptionRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Prescription>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Prescriptions
            .AsNoTracking()
            .Include(p => p.Patient)
            .Include(p => p.Doctor)
            .Include(p => p.PrescriptionItems)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Prescription>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        return await _context.Prescriptions
            .AsNoTracking()
            .Include(p => p.Patient)
            .Include(p => p.Doctor)
            .Include(p => p.PrescriptionItems)
            .Where(p => p.PatientId == patientId)
            .ToListAsync(cancellationToken);
    }

    public async Task<Prescription?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Prescriptions
            .Include(p => p.Patient)
            .Include(p => p.Doctor)
            .Include(p => p.PrescriptionItems)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<Prescription> AddAsync(Prescription prescription, CancellationToken cancellationToken = default)
    {
        await _context.Prescriptions.AddAsync(prescription, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return prescription;
    }

    public async Task UpdateAsync(Prescription prescription, CancellationToken cancellationToken = default)
    {
        _context.Prescriptions.Update(prescription);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
