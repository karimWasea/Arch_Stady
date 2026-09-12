using HospitalManagement.Adapters.Persistence.Context;
using HospitalManagement.Adapters.Persistence.Repositories;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalManagement.Adapters.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistenceAdapter(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseSqlServer(connectionString);
        });

        // Register Outbound Repository Ports
        services.AddScoped<IAppointmentRepository, SqlAppointmentRepository>();
        services.AddScoped<IPatientRepository, SqlPatientRepository>();
        services.AddScoped<IDoctorRepository, SqlDoctorRepository>();
        services.AddScoped<IDepartmentRepository, SqlDepartmentRepository>();
        services.AddScoped<IMedicalRecordRepository, SqlMedicalRecordRepository>();
        services.AddScoped<IPrescriptionRepository, SqlPrescriptionRepository>();
        services.AddScoped<IUserRepository, SqlUserRepository>();

        return services;
    }
}
