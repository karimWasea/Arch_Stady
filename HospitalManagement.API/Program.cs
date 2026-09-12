using System.Text;
using FluentValidation;
using HospitalManagement.Adapters.Caching.Redis;
using HospitalManagement.Adapters.Notifications.Email;
using HospitalManagement.Adapters.Persistence;
using HospitalManagement.Adapters.Persistence.Context;
using HospitalManagement.Adapters.Persistence.Data;
using HospitalManagement.API.Middleware;
using HospitalManagement.Core.Ports.Inbound;
using HospitalManagement.Core.Security;
using HospitalManagement.Core.UseCases;
using HospitalManagement.Core.Validators;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ==============================================================================
// 1. DRIVEN (SECONDARY) ADAPTERS CONFIGURATION
// ==============================================================================

// Persistence Adapter (EF Core + SQL Server)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=(localdb)\\mssqllocaldb;Database=HospitalManagementDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";
builder.Services.AddPersistenceAdapter(connectionString);

// Caching Adapter (Redis with resilient in-memory fallback)
builder.Services.AddRedisCacheAdapter();

// Notifications Adapter (Email with responsive HTML & console preview)
builder.Services.AddEmailNotificationAdapter(builder.Configuration);

// ==============================================================================
// 2. CORE SERVICES & INBOUND (PRIMARY) USE CASES DI
// ==============================================================================
builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();
builder.Services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

// Register Inbound Ports (Driving Use Cases)
builder.Services.AddScoped<IAppointmentUseCases, AppointmentUseCases>();
builder.Services.AddScoped<IPatientUseCases, PatientUseCases>();
builder.Services.AddScoped<IDoctorUseCases, DoctorUseCases>();
builder.Services.AddScoped<IDepartmentUseCases, DepartmentUseCases>();
builder.Services.AddScoped<IMedicalRecordUseCases, MedicalRecordUseCases>();
builder.Services.AddScoped<IPrescriptionUseCases, PrescriptionUseCases>();
builder.Services.AddScoped<IAuthUseCases, AuthUseCases>();

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<CreatePatientDtoValidator>();
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestDtoValidator>();

// ==============================================================================
// 3. AUTHENTICATION & AUTHORIZATION
// ==============================================================================
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] 
    ?? "HospitalManagement_SuperSecretKey_ForDevelopment_MustBeAtLeast32BytesLong!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "HospitalManagementAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "HospitalManagementClients";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ==============================================================================
// 4. CORS POLICY (Angular Frontend Support)
// ==============================================================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Controllers (Primary Driving Adapter)
builder.Services.AddControllers();

// ==============================================================================
// 5. SWAGGER WITH BEARER AUTH
// ==============================================================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Hospital Management System API (Hexagonal Architecture)",
        Version = "v2",
        Description = "Step 2: Hexagonal Architecture (Ports & Adapters) with Redis Caching and Email Notification Adapters."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ==============================================================================
// 6. PIPELINE MIDDLEWARE
// ==============================================================================
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("AllowAngularApp");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hospital Management API v2 (Hexagonal)");
        c.RoutePrefix = string.Empty;
    });
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ==============================================================================
// 7. DATABASE MIGRATION & SEEDING
// ==============================================================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        logger.LogInformation("Applying EF Core migrations...");
        await context.Database.MigrateAsync();
        logger.LogInformation("Database migrated successfully.");

        logger.LogInformation("Seeding database...");
        await DbInitializer.SeedAsync(context);
        logger.LogInformation("Database seeded successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during database migration/seeding.");
    }
}

app.Run();
