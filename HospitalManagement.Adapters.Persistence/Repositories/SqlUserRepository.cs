using HospitalManagement.Adapters.Persistence.Context;
using HospitalManagement.Core.Domain;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Adapters.Persistence.Repositories;

public class SqlUserRepository : IUserRepository
{
    private readonly ApplicationDbContext _context;

    public SqlUserRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        var normalized = username.Trim().ToLower();
        return await _context.Users.FirstOrDefaultAsync(u =>
            u.Username.ToLower() == normalized ||
            u.Email.ToLower() == normalized, cancellationToken);
    }

    public async Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Users.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default)
    {
        var normalized = username.Trim().ToLower();
        return await _context.Users.AnyAsync(u => u.Username.ToLower() == normalized, cancellationToken);
    }

    public async Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalized = email.Trim().ToLower();
        return await _context.Users.AnyAsync(u => u.Email.ToLower() == normalized, cancellationToken);
    }

    public async Task<User> AddAsync(User user, CancellationToken cancellationToken = default)
    {
        await _context.Users.AddAsync(user, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return user;
    }

    public async Task<bool> AnyAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users.AnyAsync(cancellationToken);
    }
}
