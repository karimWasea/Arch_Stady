using HospitalManagement.Adapters.Persistence.Context;
using HospitalManagement.Core.Domain;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Adapters.Persistence.Repositories;

public class SqlPatientRepository : IPatientRepository
{
    private readonly ApplicationDbContext _context;

    public SqlPatientRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Patient>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Patients
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<Patient?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Patients.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Patients.AnyAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<Patient> AddAsync(Patient patient, CancellationToken cancellationToken = default)
    {
        await _context.Patients.AddAsync(patient, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return patient;
    }

    public async Task UpdateAsync(Patient patient, CancellationToken cancellationToken = default)
    {
        _context.Patients.Update(patient);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Patient patient, CancellationToken cancellationToken = default)
    {
        _context.Patients.Remove(patient);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
