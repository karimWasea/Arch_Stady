using FluentValidation;
using HospitalManagement.API.Middleware;
using HospitalManagement.Business.Interfaces;
using HospitalManagement.Business.Services;
using HospitalManagement.Business.Validators;
using HospitalManagement.DataAccess.Context;
using HospitalManagement.DataAccess.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Add DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=(localdb)\\mssqllocaldb;Database=HospitalManagementDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(connectionString);
});

// 2. Add FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<CreatePatientDtoValidator>();

// 3. Register Business Services (Scoped lifetime)
builder.Services.AddScoped<IPatientService, PatientService>();
builder.Services.AddScoped<IDoctorService, DoctorService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<IMedicalRecordService, MedicalRecordService>();
builder.Services.AddScoped<IPrescriptionService, PrescriptionService>();

// 4. Add Controllers
builder.Services.AddControllers();

// 5. Add Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Hospital Management System API (Layered Architecture)",
        Version = "v1",
        Description = "Step 1: Traditional Layered Architecture implementation of the Hospital Management System."
    });
});

var app = builder.Build();

// 6. Exception Handling Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// 7. Swagger UI
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hospital Management API v1");
    c.RoutePrefix = string.Empty; // Swagger at application root (http://localhost:<port>/)
});

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// 8. Auto-migrate/ensure database and seed initial data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();
        await DbInitializer.SeedAsync(context);
        logger.LogInformation("Database initialized and seeded successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while initializing the database.");
    }
}

app.Run();

// For integration testing support
public partial class Program { }
