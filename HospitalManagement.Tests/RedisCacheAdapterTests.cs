using HospitalManagement.Adapters.Caching.Redis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace HospitalManagement.Tests;

public class RedisCacheAdapterTests
{
    [Fact]
    public async Task RedisCacheAdapter_WhenRedisOffline_FallsBackToMemoryCacheSeamlessly()
    {
        // Arrange - point to dummy port where Redis is guaranteed offline
        var inMemoryConfig = new Dictionary<string, string?>
        {
            { "Redis:ConnectionString", "localhost:59999,abortConnect=false,connectTimeout=500" }
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(inMemoryConfig).Build();
        var logger = NullLogger<RedisCacheAdapter>.Instance;

        var adapter = new RedisCacheAdapter(config, logger);

        // Act - Store item
        await adapter.SetAsync("test:patient:1", "John Doe", TimeSpan.FromMinutes(5));
        var retrieved = await adapter.GetAsync<string>("test:patient:1");

        // Assert
        Assert.Equal("John Doe", retrieved);

        // Act - Remove item
        await adapter.RemoveAsync("test:patient:1");
        var afterRemoval = await adapter.GetAsync<string>("test:patient:1");

        // Assert
        Assert.Null(afterRemoval);
    }
}
