using System.Collections.Concurrent;
using System.Text.Json;
using HospitalManagement.Application.Interfaces.Caching;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace HospitalManagement.Infrastructure.Caching;

public class RedisCacheService : ICacheService
{
    private readonly ILogger<RedisCacheService> _logger;
    private readonly IConnectionMultiplexer? _redis;
    private readonly IDatabase? _db;
    private readonly bool _isRedisAvailable;

    private static readonly ConcurrentDictionary<string, (string Json, DateTime? Expiry)> _memoryCache = new();

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public RedisCacheService(IConfiguration configuration, ILogger<RedisCacheService> logger)
    {
        _logger = logger;
        var connectionString = configuration.GetConnectionString("Redis") 
            ?? configuration["Redis:ConnectionString"] 
            ?? "localhost:6379,abortConnect=false,connectTimeout=2000";

        try
        {
            var options = ConfigurationOptions.Parse(connectionString);
            options.AbortOnConnectFail = false;
            options.ConnectTimeout = 2000;

            _redis = ConnectionMultiplexer.Connect(options);
            _db = _redis.GetDatabase();
            _isRedisAvailable = _redis.IsConnected;

            if (_isRedisAvailable)
            {
                _logger.LogInformation("[RedisCacheService] Connected to Redis at {Endpoints}", string.Join(", ", options.EndPoints));
            }
            else
            {
                _logger.LogWarning("[RedisCacheService] Redis not reachable at {ConnectionString}. Using in-memory fallback.", connectionString);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[RedisCacheService] Could not initialize Redis connection. Falling back to in-memory cache.");
            _isRedisAvailable = false;
        }
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            if (_isRedisAvailable && _redis != null && _redis.IsConnected && _db != null)
            {
                var redisValue = await _db.StringGetAsync(key);
                if (redisValue.HasValue)
                {
                    _logger.LogDebug("[RedisCacheService] Redis Cache HIT for key: {Key}", key);
                    return JsonSerializer.Deserialize<T>(redisValue.ToString(), _jsonOptions);
                }
            }
            else
            {
                if (_memoryCache.TryGetValue(key, out var entry))
                {
                    if (entry.Expiry.HasValue && entry.Expiry.Value < DateTime.UtcNow)
                    {
                        _memoryCache.TryRemove(key, out _);
                        return default;
                    }

                    _logger.LogDebug("[RedisCacheService] In-Memory Cache HIT for key: {Key}", key);
                    return JsonSerializer.Deserialize<T>(entry.Json, _jsonOptions);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[RedisCacheService] Error reading key '{Key}' from cache.", key);
        }

        return default;
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var json = JsonSerializer.Serialize(value, _jsonOptions);
            var ttl = expiration ?? TimeSpan.FromMinutes(10);

            if (_isRedisAvailable && _redis != null && _redis.IsConnected && _db != null)
            {
                await _db.StringSetAsync(key, json, ttl);
                _logger.LogDebug("[RedisCacheService] Stored '{Key}' in Redis with TTL {TTL}", key, ttl);
            }
            else
            {
                var expiryDate = DateTime.UtcNow.Add(ttl);
                _memoryCache[key] = (json, expiryDate);
                _logger.LogDebug("[RedisCacheService] Stored '{Key}' in MemoryCache with TTL {TTL}", key, ttl);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[RedisCacheService] Failed to store key '{Key}' in cache.", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            if (_isRedisAvailable && _redis != null && _redis.IsConnected && _db != null)
            {
                await _db.KeyDeleteAsync(key);
            }

            _memoryCache.TryRemove(key, out _);
            _logger.LogDebug("[RedisCacheService] Removed key '{Key}' from cache.", key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[RedisCacheService] Failed to remove key '{Key}' from cache.", key);
        }
    }

    public async Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default)
    {
        try
        {
            if (_isRedisAvailable && _redis != null && _redis.IsConnected && _db != null)
            {
                foreach (var endpoint in _redis.GetEndPoints())
                {
                    var server = _redis.GetServer(endpoint);
                    if (server.IsConnected)
                    {
                        var keys = server.Keys(pattern: $"{prefix}*").ToArray();
                        if (keys.Length > 0)
                        {
                            await _db.KeyDeleteAsync(keys);
                        }
                    }
                }
            }

            var matchingMemoryKeys = _memoryCache.Keys.Where(k => k.StartsWith(prefix)).ToList();
            foreach (var memKey in matchingMemoryKeys)
            {
                _memoryCache.TryRemove(memKey, out _);
            }

            _logger.LogDebug("[RedisCacheService] Evicted cache keys matching prefix '{Prefix}*'", prefix);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[RedisCacheService] Error evicting cache keys with prefix '{Prefix}'", prefix);
        }
    }
}
