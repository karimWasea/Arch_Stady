namespace HospitalManagement.Core.Ports.Outbound.Caching;

/// <summary>
/// Driven (Outbound) Port for distributed and in-memory caching.
/// Core application logic relies on this port; the Redis adapter implements it.
/// </summary>
public interface ICachePort
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);

    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default);

    Task RemoveAsync(string key, CancellationToken cancellationToken = default);

    Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default);
}
