using HospitalManagement.Core.Domain;
using HospitalManagement.Core.DTOs.Auth;
using HospitalManagement.Core.Exceptions;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using HospitalManagement.Core.Security;
using HospitalManagement.Core.UseCases;
using Microsoft.Extensions.Configuration;
using Moq;

namespace HospitalManagement.Tests;

public class AuthUseCasesTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly IPasswordHasher _passwordHasher = new PasswordHasher();
    private readonly IJwtTokenGenerator _jwtTokenGenerator = new JwtTokenGenerator();
    private readonly IConfiguration _configuration;
    private readonly AuthUseCases _useCases;

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

        _useCases = new AuthUseCases(
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
        var response = await _useCases.LoginAsync(dto);

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
        await Assert.ThrowsAsync<BusinessRuleException>(() => _useCases.LoginAsync(dto));
    }
}
