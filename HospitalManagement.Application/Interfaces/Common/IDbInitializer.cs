namespace HospitalManagement.Application.Interfaces.Common;

public interface IDbInitializer
{
    Task InitializeAsync(CancellationToken cancellationToken = default);
}
