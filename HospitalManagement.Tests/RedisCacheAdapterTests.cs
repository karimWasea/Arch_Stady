using HospitalManagement.Infrastructure.Caching;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace HospitalManagement.Tests;

public class RedisCacheServiceTests
{
    [Fact]
    public async Task RedisCacheService_WhenRedisOffline_FallsBackToMemoryCacheSeamlessly()
    {
        // Arrange - point to dummy port where Redis is guaranteed offline
        var inMemoryConfig = new Dictionary<string, string?>
        {
            { "Redis:ConnectionString", "localhost:59999,abortConnect=false,connectTimeout=500" }
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(inMemoryConfig).Build();
        var logger = NullLogger<RedisCacheService>.Instance;

        var service = new RedisCacheService(config, logger);

        // Act - Store item
        await service.SetAsync("test:patient:1", "John Doe", TimeSpan.FromMinutes(5));
        var retrieved = await service.GetAsync<string>("test:patient:1");

        // Assert
        Assert.Equal("John Doe", retrieved);

        // Act - Remove item
        await service.RemoveAsync("test:patient:1");
        var afterRemoval = await service.GetAsync<string>("test:patient:1");

        // Assert
        Assert.Null(afterRemoval);
    }
}
