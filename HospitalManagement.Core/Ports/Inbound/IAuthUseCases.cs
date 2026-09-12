using HospitalManagement.Core.DTOs.Auth;

namespace HospitalManagement.Core.Ports.Inbound;

public interface IAuthUseCases
{
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken = default);
    Task<UserDto> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default);
}
