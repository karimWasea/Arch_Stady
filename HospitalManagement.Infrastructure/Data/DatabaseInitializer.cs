using HospitalManagement.Application.Interfaces.Common;
using Microsoft.Extensions.Logging;

namespace HospitalManagement.Infrastructure.Data;

public class DatabaseInitializer : IDbInitializer
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(ApplicationDbContext context, ILogger<DatabaseInitializer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Ensuring database is created with Onion schema...");
            await _context.Database.EnsureCreatedAsync(cancellationToken);
            _logger.LogInformation("Database ready. Seeding initial data...");
            await DbInitializer.SeedAsync(_context);
            _logger.LogInformation("Database seeded successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred during database initialization/seeding.");
        }
    }
}
