using HospitalManagement.Core.Ports.Outbound.Notifications;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalManagement.Adapters.Notifications.Email;

public static class DependencyInjection
{
    public static IServiceCollection AddEmailNotificationAdapter(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<EmailSettings>(configuration.GetSection(EmailSettings.SectionName));
        services.AddSingleton<INotificationPort, EmailNotificationAdapter>();
        return services;
    }
}
