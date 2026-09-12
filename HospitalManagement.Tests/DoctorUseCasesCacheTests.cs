using HospitalManagement.Core.Domain;
using HospitalManagement.Core.DTOs.Doctor;
using HospitalManagement.Core.Ports.Outbound.Caching;
using HospitalManagement.Core.Ports.Outbound.Repositories;
using HospitalManagement.Core.UseCases;
using Moq;

namespace HospitalManagement.Tests;

public class DoctorUseCasesCacheTests
{
    private readonly Mock<IDoctorRepository> _doctorRepoMock = new();
    private readonly Mock<IDepartmentRepository> _departmentRepoMock = new();
    private readonly Mock<ICachePort> _cachePortMock = new();

    private readonly DoctorUseCases _useCases;

    public DoctorUseCasesCacheTests()
    {
        _useCases = new DoctorUseCases(
            _doctorRepoMock.Object,
            _departmentRepoMock.Object,
            _cachePortMock.Object);
    }

    [Fact]
    public async Task GetAllAsync_WhenCacheHit_ReturnsCachedDataWithoutCallingRepository()
    {
        // Arrange
        var cachedDoctors = new List<DoctorDto>
        {
            new() { Id = 1, FirstName = "Cached", LastName = "Doctor", Specialization = "Oncology" }
        };

        _cachePortMock.Setup(c => c.GetAsync<IEnumerable<DoctorDto>>("doctors:all", It.IsAny<CancellationToken>()))
            .ReturnsAsync(cachedDoctors);

        // Act
        var result = await _useCases.GetAllAsync();

        // Assert
        Assert.Single(result);
        Assert.Equal("Cached", result.First().FirstName);

        // Verify repository was NEVER called (Cache Hit!)
        _doctorRepoMock.Verify(r => r.GetAllAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetAllAsync_WhenCacheMiss_FetchesFromRepositoryAndStoresInCache()
    {
        // Arrange
        _cachePortMock.Setup(c => c.GetAsync<IEnumerable<DoctorDto>>("doctors:all", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IEnumerable<DoctorDto>?)null); // Cache Miss

        var dbDoctors = new List<Doctor>
        {
            new() { Id = 10, FirstName = "Gregory", LastName = "House", Specialization = "Diagnostics" }
        };

        _doctorRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(dbDoctors);

        // Act
        var result = await _useCases.GetAllAsync();

        // Assert
        Assert.Single(result);
        Assert.Equal("Gregory", result.First().FirstName);

        // Verify repository was queried
        _doctorRepoMock.Verify(r => r.GetAllAsync(It.IsAny<CancellationToken>()), Times.Once);

        // Verify result was cached into Redis
        _cachePortMock.Verify(c => c.SetAsync(
            "doctors:all",
            It.IsAny<IEnumerable<DoctorDto>>(),
            It.Is<TimeSpan?>(t => t.HasValue && t.Value == TimeSpan.FromMinutes(10)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_InvalidatesDoctorsCache()
    {
        // Arrange
        var dto = new CreateDoctorDto
        {
            FirstName = "James",
            LastName = "Wilson",
            Specialization = "Oncology",
            DepartmentId = 1,
            Email = "wilson@hospital.org",
            Phone = "555-1234"
        };

        _departmentRepoMock.Setup(d => d.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Department { Id = 1, Name = "Oncology" });

        _doctorRepoMock.Setup(r => r.AddAsync(It.IsAny<Doctor>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Doctor d, CancellationToken _) =>
            {
                d.Id = 5;
                return d;
            });

        // Act
        var result = await _useCases.CreateAsync(dto);

        // Assert
        Assert.Equal(5, result.Id);
        _cachePortMock.Verify(c => c.RemoveByPrefixAsync("doctors:", It.IsAny<CancellationToken>()), Times.Once);
    }
}
