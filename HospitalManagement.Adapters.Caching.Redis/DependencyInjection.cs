using HospitalManagement.Core.Ports.Outbound.Caching;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalManagement.Adapters.Caching.Redis;

public static class DependencyInjection
{
    public static IServiceCollection AddRedisCacheAdapter(this IServiceCollection services)
    {
        services.AddSingleton<ICachePort, RedisCacheAdapter>();
        return services;
    }
}
