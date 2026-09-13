using System.Text;
using HospitalManagement.Application;
using HospitalManagement.API.Middleware;
using HospitalManagement.Infrastructure;
using HospitalManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ==============================================================================
// 1. ONION ARCHITECTURE LAYERS REGISTRATION
// ==============================================================================

// Middle Ring: Application Layer (Use Cases, Application Services, Validators)
builder.Services.AddApplication();

// Outer Ring: Infrastructure Layer (EF Core, SQL Server, Redis Cache, Email)
builder.Services.AddInfrastructure(builder.Configuration);

// ==============================================================================
// 2. AUTHENTICATION & AUTHORIZATION (JWT)
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
// 3. CORS POLICY (Angular Frontend Support)
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

// Presentation Ring: Controllers
builder.Services.AddControllers();

// ==============================================================================
// 4. SWAGGER WITH BEARER AUTH
// ==============================================================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Hospital Management System API (Onion Architecture)",
        Version = "v3",
        Description = "Step 3: Onion Architecture with Jeffrey Palermo Concentric Rings (Domain -> Application -> Infrastructure & Presentation). Includes Clinical, Pharmacy, Laboratory, and Billing Subsystems."
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
// 5. PIPELINE MIDDLEWARE
// ==============================================================================
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("AllowAngularApp");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hospital Management API v3 (Onion)");
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
// 6. DATABASE INITIALIZATION & SEEDING
// ==============================================================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        logger.LogInformation("Ensuring database is created with updated Onion schema...");
        await context.Database.EnsureCreatedAsync();
        logger.LogInformation("Database ready.");

        logger.LogInformation("Seeding database...");
        await DbInitializer.SeedAsync(context);
        logger.LogInformation("Database seeded successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during database initialization/seeding.");
    }
}

app.Run();
