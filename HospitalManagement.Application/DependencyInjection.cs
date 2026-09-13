using System.Reflection;
using FluentValidation;
using HospitalManagement.Application.Security;
using HospitalManagement.Application.Services.Billing;
using HospitalManagement.Application.Services.Clinical;
using HospitalManagement.Application.Services.Laboratory;
using HospitalManagement.Application.Services.Pharmacy;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalManagement.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Security & Utilities
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        // Clinical Services
        services.AddScoped<IAppointmentService, AppointmentService>();
        services.AddScoped<IPatientService, PatientService>();
        services.AddScoped<IDoctorService, DoctorService>();
        services.AddScoped<IDepartmentService, DepartmentService>();
        services.AddScoped<IMedicalRecordService, MedicalRecordService>();
        services.AddScoped<IPrescriptionService, PrescriptionService>();
        services.AddScoped<IAuthService, AuthService>();

        // New Subsystem Services (Pharmacy, Laboratory, Billing)
        services.AddScoped<IPharmacyService, PharmacyService>();
        services.AddScoped<ILaboratoryService, LaboratoryService>();
        services.AddScoped<IBillingService, BillingService>();

        // FluentValidation
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        return services;
    }
}
