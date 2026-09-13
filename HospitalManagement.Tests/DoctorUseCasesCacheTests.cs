using HospitalManagement.Application.DTOs.Clinical;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Application.Services.Clinical;
using HospitalManagement.Domain.Entities.Clinical;
using Moq;

namespace HospitalManagement.Tests;

public class DoctorUseCasesCacheTests
{
    private readonly Mock<IDoctorRepository> _doctorRepoMock = new();
    private readonly Mock<IDepartmentRepository> _departmentRepoMock = new();
    private readonly Mock<ICacheService> _cacheServiceMock = new();

    private readonly DoctorService _service;

    public DoctorUseCasesCacheTests()
    {
        _service = new DoctorService(
            _doctorRepoMock.Object,
            _departmentRepoMock.Object,
            _cacheServiceMock.Object);
    }

    [Fact]
    public async Task GetAllAsync_WhenCacheHit_ReturnsCachedDataWithoutCallingRepository()
    {
        // Arrange
        var cachedDoctors = new List<DoctorDto>
        {
            new() { Id = 1, FirstName = "Cached", LastName = "Doctor", Specialization = "Oncology" }
        };

        _cacheServiceMock.Setup(c => c.GetAsync<IEnumerable<DoctorDto>>("doctors:all", It.IsAny<CancellationToken>()))
            .ReturnsAsync(cachedDoctors);

        // Act
        var result = await _service.GetAllAsync();

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
        _cacheServiceMock.Setup(c => c.GetAsync<IEnumerable<DoctorDto>>("doctors:all", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IEnumerable<DoctorDto>?)null); // Cache Miss

        var dbDoctors = new List<Doctor>
        {
            Doctor.Create("Gregory", "House", "Diagnostics", "555-0000", "house@hospital.org", 1).SetId(10)
        };

        _doctorRepoMock.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(dbDoctors);

        // Act
        var result = await _service.GetAllAsync();

        // Assert
        Assert.Single(result);
        Assert.Equal("Gregory", result.First().FirstName);

        // Verify repository was queried
        _doctorRepoMock.Verify(r => r.GetAllAsync(It.IsAny<CancellationToken>()), Times.Once);

        // Verify result was cached into Redis
        _cacheServiceMock.Verify(c => c.SetAsync(
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
            .ReturnsAsync(Department.Create("Oncology", "Cancer care").SetId(1));

        _doctorRepoMock.Setup(r => r.AddAsync(It.IsAny<Doctor>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Doctor d, CancellationToken _) =>
            {
                d.SetId(5);
                return d;
            });

        // Act
        var result = await _service.CreateAsync(dto);

        // Assert
        Assert.Equal(5, result.Id);
        _cacheServiceMock.Verify(c => c.RemoveByPrefixAsync("doctors:", It.IsAny<CancellationToken>()), Times.Once);
    }
}
