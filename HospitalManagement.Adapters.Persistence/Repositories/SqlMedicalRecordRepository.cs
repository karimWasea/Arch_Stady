using HospitalManagement.Adapters.Persistence.Context;
using HospitalManagement.Core.Domain;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Adapters.Persistence.Repositories;

public class SqlMedicalRecordRepository : IMedicalRecordRepository
{
    private readonly ApplicationDbContext _context;

    public SqlMedicalRecordRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MedicalRecord>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.MedicalRecords
            .AsNoTracking()
            .Include(r => r.Patient)
            .Include(r => r.Doctor)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<MedicalRecord>> GetByPatientIdAsync(int patientId, CancellationToken cancellationToken = default)
    {
        return await _context.MedicalRecords
            .AsNoTracking()
            .Include(r => r.Patient)
            .Include(r => r.Doctor)
            .Where(r => r.PatientId == patientId)
            .ToListAsync(cancellationToken);
    }

    public async Task<MedicalRecord?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.MedicalRecords
            .Include(r => r.Patient)
            .Include(r => r.Doctor)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<MedicalRecord> AddAsync(MedicalRecord record, CancellationToken cancellationToken = default)
    {
        await _context.MedicalRecords.AddAsync(record, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return record;
    }

    public async Task UpdateAsync(MedicalRecord record, CancellationToken cancellationToken = default)
    {
        _context.MedicalRecords.Update(record);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
