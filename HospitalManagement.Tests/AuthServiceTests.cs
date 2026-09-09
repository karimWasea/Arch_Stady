using HospitalManagement.Business.DTOs.Auth;
using HospitalManagement.Business.Exceptions;
using HospitalManagement.Business.Security;
using HospitalManagement.Business.Services;
using HospitalManagement.DataAccess.Context;
using HospitalManagement.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace HospitalManagement.Tests;

public class AuthServiceTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private IConfiguration CreateConfiguration()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Jwt:SecretKey", "TestSecretKeyForTestingPurposesMustBeLongEnough12345!"},
            {"Jwt:Issuer", "TestIssuer"},
            {"Jwt:Audience", "TestAudience"},
            {"Jwt:ExpiryMinutes", "60"}
        };

        return new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    [Fact]
    public async Task RegisterAsync_ValidDto_ShouldPersistUserAndReturnToken()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var hasher = new PasswordHasher();
        var jwtGen = new JwtTokenGenerator();
        var config = CreateConfiguration();
        var authService = new AuthService(context, hasher, jwtGen, config);

        var dto = new RegisterRequestDto
        {
            Username = "dr.watson",
            Email = "watson@hospital.org",
            FullName = "Dr. John Watson",
            Password = "Password123!",
            Role = UserRole.Doctor
        };

        // Act
        var result = await authService.RegisterAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));
        Assert.Equal("dr.watson", result.User.Username);
        Assert.Equal("Doctor", result.User.Role);

        var userInDb = await context.Users.FirstOrDefaultAsync(u => u.Username == "dr.watson");
        Assert.NotNull(userInDb);
        Assert.NotEmpty(userInDb.PasswordHash);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateUsername_ShouldThrowConflictException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var hasher = new PasswordHasher();
        var jwtGen = new JwtTokenGenerator();
        var config = CreateConfiguration();
        var authService = new AuthService(context, hasher, jwtGen, config);

        var dto1 = new RegisterRequestDto
        {
            Username = "nurse.mary",
            Email = "mary1@hospital.org",
            FullName = "Mary Smith",
            Password = "Password123!",
            Role = UserRole.Staff
        };
        await authService.RegisterAsync(dto1);

        var dto2 = new RegisterRequestDto
        {
            Username = "nurse.mary", // Duplicate
            Email = "mary2@hospital.org",
            FullName = "Mary Jones",
            Password = "Password123!",
            Role = UserRole.Staff
        };

        // Act & Assert
        await Assert.ThrowsAsync<ConflictException>(() => authService.RegisterAsync(dto2));
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ShouldReturnAuthResponse()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var hasher = new PasswordHasher();
        var jwtGen = new JwtTokenGenerator();
        var config = CreateConfiguration();
        var authService = new AuthService(context, hasher, jwtGen, config);

        await authService.RegisterAsync(new RegisterRequestDto
        {
            Username = "clerk.bob",
            Email = "bob@hospital.org",
            FullName = "Bob Clerk",
            Password = "SecurePassword123!",
            Role = UserRole.Staff
        });

        // Act
        var loginResult = await authService.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "clerk.bob",
            Password = "SecurePassword123!"
        });

        // Assert
        Assert.NotNull(loginResult);
        Assert.False(string.IsNullOrWhiteSpace(loginResult.Token));
        Assert.Equal("clerk.bob", loginResult.User.Username);
    }

    [Fact]
    public async Task LoginAsync_InvalidPassword_ShouldThrowBusinessRuleException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var hasher = new PasswordHasher();
        var jwtGen = new JwtTokenGenerator();
        var config = CreateConfiguration();
        var authService = new AuthService(context, hasher, jwtGen, config);

        await authService.RegisterAsync(new RegisterRequestDto
        {
            Username = "clerk.bob",
            Email = "bob@hospital.org",
            FullName = "Bob Clerk",
            Password = "CorrectPassword123!",
            Role = UserRole.Staff
        });

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() => authService.LoginAsync(new LoginRequestDto
        {
            UsernameOrEmail = "clerk.bob",
            Password = "WrongPassword!"
        }));
        Assert.Contains("Invalid username or password", ex.Message);
    }
}
