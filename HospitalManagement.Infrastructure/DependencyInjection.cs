using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Common;
using HospitalManagement.Application.Interfaces.Notifications;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Infrastructure.Caching;
using HospitalManagement.Infrastructure.Data;
using HospitalManagement.Infrastructure.Notifications;
using HospitalManagement.Infrastructure.Repositories;
using HospitalManagement.Infrastructure.Repositories.Billing;
using HospitalManagement.Infrastructure.Repositories.Clinical;
using HospitalManagement.Infrastructure.Repositories.Laboratory;
using HospitalManagement.Infrastructure.Repositories.Pharmacy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalManagement.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // EF Core Database Context
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)
            ));

        // Unit of Work
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Clinical Repositories
        services.AddScoped<IPatientRepository, PatientRepository>();
        services.AddScoped<IDoctorRepository, DoctorRepository>();
        services.AddScoped<IDepartmentRepository, DepartmentRepository>();
        services.AddScoped<IAppointmentRepository, AppointmentRepository>();
        services.AddScoped<IMedicalRecordRepository, MedicalRecordRepository>();
        services.AddScoped<IPrescriptionRepository, PrescriptionRepository>();
        services.AddScoped<IUserRepository, UserRepository>();

        // Pharmacy Repositories
        services.AddScoped<IMedicineRepository, MedicineRepository>();
        services.AddScoped<IStockRepository, StockRepository>();
        services.AddScoped<IDispensingRepository, DispensingRepository>();

        // Laboratory Repositories
        services.AddScoped<ILabTestRepository, LabTestRepository>();
        services.AddScoped<ILabOrderRepository, LabOrderRepository>();
        services.AddScoped<ILabResultRepository, LabResultRepository>();

        // Billing Repositories
        services.AddScoped<IInvoiceRepository, InvoiceRepository>();
        services.AddScoped<IPaymentRepository, PaymentRepository>();
        services.AddScoped<IInsuranceRepository, InsuranceRepository>();

        // Caching & Email
        services.AddSingleton<ICacheService, RedisCacheService>();
        services.AddScoped<IEmailService, EmailService>();

        return services;
    }
}
