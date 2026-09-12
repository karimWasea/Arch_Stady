using HospitalManagement.Core.Domain;
using HospitalManagement.Core.DTOs.Auth;
using HospitalManagement.Core.Exceptions;
using HospitalManagement.Core.Ports.Inbound;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using HospitalManagement.Core.Security;
using Microsoft.Extensions.Configuration;

namespace HospitalManagement.Core.UseCases;

public class AuthUseCases : IAuthUseCases
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IConfiguration _configuration;

    public AuthUseCases(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto, CancellationToken cancellationToken = default)
    {
        var normalizedInput = dto.UsernameOrEmail.Trim().ToLower();

        var user = await _userRepository.GetByUsernameAsync(normalizedInput, cancellationToken);
        if (user == null)
        {
            throw new BusinessRuleException("Invalid username or password.");
        }

        var isPasswordValid = _passwordHasher.VerifyPasswordHash(dto.Password, user.PasswordHash, user.PasswordSalt);
        if (!isPasswordValid)
        {
            throw new BusinessRuleException("Invalid username or password.");
        }

        return GenerateAuthResponse(user);
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto, CancellationToken cancellationToken = default)
    {
        var usernameExists = await _userRepository.UsernameExistsAsync(dto.Username.Trim().ToLower(), cancellationToken);
        if (usernameExists)
        {
            throw new ConflictException($"Username '{dto.Username}' is already taken.");
        }

        var emailExists = await _userRepository.EmailExistsAsync(dto.Email.Trim().ToLower(), cancellationToken);
        if (emailExists)
        {
            throw new ConflictException($"Email '{dto.Email}' is already registered.");
        }

        _passwordHasher.CreatePasswordHash(dto.Password, out var hash, out var salt);

        var user = new User
        {
            Username = dto.Username.Trim(),
            Email = dto.Email.Trim(),
            FullName = dto.FullName.Trim(),
            PasswordHash = hash,
            PasswordSalt = salt,
            Role = dto.Role,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _userRepository.AddAsync(user, cancellationToken);
        return GenerateAuthResponse(created);
    }

    public async Task<UserDto> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null)
        {
            throw new NotFoundException(nameof(User), userId);
        }

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            CreatedAt = user.CreatedAt
        };
    }

    private AuthResponseDto GenerateAuthResponse(User user)
    {
        var secretKey = _configuration["Jwt:SecretKey"] ?? "HospitalManagement_SuperSecretKey_ForDevelopment_MustBeAtLeast32BytesLong!";
        var issuer = _configuration["Jwt:Issuer"] ?? "HospitalManagementAPI";
        var audience = _configuration["Jwt:Audience"] ?? "HospitalManagementClients";
        var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryInMinutes"], out var minutes) ? minutes : 480;

        var token = _jwtTokenGenerator.GenerateToken(user, secretKey, issuer, audience, expiryMinutes);
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        return new AuthResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                CreatedAt = user.CreatedAt
            }
        };
    }
}
