using HospitalManagement.Application.DTOs.Pharmacy;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Application.Services.Pharmacy;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Entities.Pharmacy;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;
using Moq;

namespace HospitalManagement.Tests;

public class PharmacyServiceTests
{
    private readonly Mock<IMedicineRepository> _medicineRepoMock = new();
    private readonly Mock<IStockRepository> _stockRepoMock = new();
    private readonly Mock<IDispensingRepository> _dispensingRepoMock = new();
    private readonly Mock<IPatientRepository> _patientRepoMock = new();
    private readonly Mock<ICacheService> _cacheServiceMock = new();

    private readonly PharmacyService _service;

    public PharmacyServiceTests()
    {
        _service = new PharmacyService(
            _medicineRepoMock.Object,
            _stockRepoMock.Object,
            _dispensingRepoMock.Object,
            _patientRepoMock.Object,
            _cacheServiceMock.Object);
    }

    [Fact]
    public async Task DispenseOrderAsync_WhenInsufficientStock_ThrowsBusinessRuleException()
    {
        // Arrange
        var request = new DispenseOrderRequestDto
        {
            PatientId = 1,
            Items = new List<DispenseItemDto>
            {
                new() { MedicineId = 10, Quantity = 50 }
            }
        };

        _patientRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Patient { Id = 1, FirstName = "Alice", LastName = "Wonder" });

        var medicine = new Medicine { Id = 10, Name = "Amoxicillin", UnitPrice = 10m };
        _medicineRepoMock.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(medicine);

        // Only 20 available in stock
        _stockRepoMock.Setup(r => r.GetTotalStockQuantityAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(20);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.DispenseOrderAsync(request));
        Assert.Contains("Insufficient stock", ex.Message);

        _stockRepoMock.Verify(r => r.DeductStockQuantityAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DispenseOrderAsync_WhenStockAvailable_DeductsStockAndReturnsDispensedOrder()
    {
        // Arrange
        var request = new DispenseOrderRequestDto
        {
            PatientId = 1,
            Items = new List<DispenseItemDto>
            {
                new() { MedicineId = 10, Quantity = 5 }
            }
        };

        var patient = new Patient { Id = 1, FirstName = "Alice", LastName = "Wonder" };
        var medicine = new Medicine { Id = 10, Name = "Amoxicillin", UnitPrice = 10m };

        _patientRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(patient);
        _medicineRepoMock.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(medicine);
        _stockRepoMock.Setup(r => r.GetTotalStockQuantityAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(100);

        _dispensingRepoMock.Setup(r => r.AddAsync(It.IsAny<DispensingOrder>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DispensingOrder o, CancellationToken _) =>
            {
                o.Id = 77;
                o.Patient = patient;
                return o;
            });

        // Act
        var result = await _service.DispenseOrderAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(77, result.Id);
        Assert.Equal(50m, result.TotalAmount); // 5 * 10 = 50
        Assert.Equal(DispensingStatus.Dispensed, result.Status);

        _stockRepoMock.Verify(r => r.DeductStockQuantityAsync(10, 5, It.IsAny<CancellationToken>()), Times.Once);
        _cacheServiceMock.Verify(c => c.RemoveByPrefixAsync("pharmacy:", It.IsAny<CancellationToken>()), Times.Once);
    }
}
