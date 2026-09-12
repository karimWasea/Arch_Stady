using HospitalManagement.Adapters.Persistence.Context;
using HospitalManagement.Core.Domain;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Adapters.Persistence.Repositories;

public class SqlDoctorRepository : IDoctorRepository
{
    private readonly ApplicationDbContext _context;

    public SqlDoctorRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Doctor>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Doctors
            .AsNoTracking()
            .Include(d => d.Department)
            .ToListAsync(cancellationToken);
    }

    public async Task<Doctor?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Doctors
            .Include(d => d.Department)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
    }

    public async Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Doctors.AnyAsync(d => d.Id == id, cancellationToken);
    }

    public async Task<Doctor> AddAsync(Doctor doctor, CancellationToken cancellationToken = default)
    {
        await _context.Doctors.AddAsync(doctor, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return doctor;
    }

    public async Task UpdateAsync(Doctor doctor, CancellationToken cancellationToken = default)
    {
        _context.Doctors.Update(doctor);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Doctor doctor, CancellationToken cancellationToken = default)
    {
        _context.Doctors.Remove(doctor);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
