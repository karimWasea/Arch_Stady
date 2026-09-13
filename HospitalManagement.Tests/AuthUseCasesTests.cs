using HospitalManagement.Application.DTOs.Auth;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Application.Security;
using HospitalManagement.Application.Services.Clinical;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;
using Microsoft.Extensions.Configuration;
using Moq;

namespace HospitalManagement.Tests;

public class AuthUseCasesTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly IPasswordHasher _passwordHasher = new PasswordHasher();
    private readonly IJwtTokenGenerator _jwtTokenGenerator = new JwtTokenGenerator();
    private readonly IConfiguration _configuration;
    private readonly AuthService _service;

    public AuthUseCasesTests()
    {
        var configData = new Dictionary<string, string?>
        {
            { "Jwt:SecretKey", "VeryLongSecretKeyForTestingHospitalManagementSystem12345!" },
            { "Jwt:Issuer", "TestIssuer" },
            { "Jwt:Audience", "TestAudience" },
            { "Jwt:ExpiryInMinutes", "60" }
        };
        _configuration = new ConfigurationBuilder().AddInMemoryCollection(configData).Build();

        _service = new AuthService(
            _userRepoMock.Object,
            _passwordHasher,
            _jwtTokenGenerator,
            _configuration);
    }

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ReturnsTokenAndUser()
    {
        // Arrange
        _passwordHasher.CreatePasswordHash("Password123!", out var hash, out var salt);
        var user = new User
        {
            Id = 1,
            Username = "staff1",
            Email = "staff1@hospital.com",
            FullName = "Staff Member",
            PasswordHash = hash,
            PasswordSalt = salt,
            Role = UserRole.Staff
        };

        _userRepoMock.Setup(r => r.GetByUsernameAsync("staff1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var dto = new LoginRequestDto { UsernameOrEmail = "staff1", Password = "Password123!" };

        // Act
        var response = await _service.LoginAsync(dto);

        // Assert
        Assert.NotNull(response);
        Assert.False(string.IsNullOrWhiteSpace(response.Token));
        Assert.Equal("staff1", response.User.Username);
        Assert.Equal("Staff", response.User.Role);
    }

    [Fact]
    public async Task LoginAsync_WithInvalidPassword_ThrowsBusinessRuleException()
    {
        // Arrange
        _passwordHasher.CreatePasswordHash("CorrectPassword", out var hash, out var salt);
        var user = new User
        {
            Id = 1,
            Username = "staff1",
            Email = "staff1@hospital.com",
            PasswordHash = hash,
            PasswordSalt = salt
        };

        _userRepoMock.Setup(r => r.GetByUsernameAsync("staff1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var dto = new LoginRequestDto { UsernameOrEmail = "staff1", Password = "WrongPassword" };

        // Act & Assert
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.LoginAsync(dto));
    }
}
