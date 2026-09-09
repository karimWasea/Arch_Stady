using HospitalManagement.Business.DTOs.Auth;

namespace HospitalManagement.Business.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginRequestDto dto);
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto);
    Task<UserDto> GetCurrentUserAsync(int userId);
}
