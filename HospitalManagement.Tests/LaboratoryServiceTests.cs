using HospitalManagement.Application.DTOs.Laboratory;
using HospitalManagement.Application.Interfaces.Caching;
using HospitalManagement.Application.Interfaces.Notifications;
using HospitalManagement.Application.Interfaces.Repositories;
using HospitalManagement.Application.Services.Laboratory;
using HospitalManagement.Domain.Entities.Clinical;
using HospitalManagement.Domain.Entities.Laboratory;
using HospitalManagement.Domain.Enums;
using Moq;

namespace HospitalManagement.Tests;

public class LaboratoryServiceTests
{
    private readonly Mock<ILabTestRepository> _labTestRepoMock = new();
    private readonly Mock<ILabOrderRepository> _labOrderRepoMock = new();
    private readonly Mock<ILabResultRepository> _labResultRepoMock = new();
    private readonly Mock<IPatientRepository> _patientRepoMock = new();
    private readonly Mock<IDoctorRepository> _doctorRepoMock = new();
    private readonly Mock<ICacheService> _cacheServiceMock = new();
    private readonly Mock<IEmailService> _emailServiceMock = new();

    private readonly LaboratoryService _service;

    public LaboratoryServiceTests()
    {
        _service = new LaboratoryService(
            _labTestRepoMock.Object,
            _labOrderRepoMock.Object,
            _labResultRepoMock.Object,
            _patientRepoMock.Object,
            _doctorRepoMock.Object,
            _cacheServiceMock.Object,
            _emailServiceMock.Object);
    }

    [Fact]
    public async Task CreateLabOrderAsync_WhenValid_PersistsOrderWithItems()
    {
        // Arrange
        var dto = new CreateLabOrderDto
        {
            PatientId = 1,
            DoctorId = 2,
            Priority = LabPriority.Urgent,
            TestIds = new List<int> { 101, 102 }
        };

        var patient = Patient.Create("Bruce", "Wayne", new DateTime(1980, 1, 1), "Male", "123", "bruce@waynecorp.com", "Gotham").SetId(1);
        var doctor = Doctor.Create("Thomas", "Wayne", "Surgeon", "123", "thomas@waynecorp.com", 1).SetId(2);
        var test1 = LabTest.Create("CBC", "Blood Count", "Hematology", "Normal", "K/uL", 50m).SetId(101);
        var test2 = LabTest.Create("GLU", "Glucose", "Metabolic", "70-99", "mg/dL", 30m).SetId(102);

        _patientRepoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(patient);
        _doctorRepoMock.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(doctor);
        _labTestRepoMock.Setup(r => r.GetByIdAsync(101, It.IsAny<CancellationToken>())).ReturnsAsync(test1);
        _labTestRepoMock.Setup(r => r.GetByIdAsync(102, It.IsAny<CancellationToken>())).ReturnsAsync(test2);

        _labOrderRepoMock.Setup(r => r.AddAsync(It.IsAny<LabOrder>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((LabOrder o, CancellationToken _) =>
            {
                o.SetId(88);
                o.Patient = patient;
                o.Doctor = doctor;
                return o;
            });

        // Act
        var result = await _service.CreateLabOrderAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(88, result.Id);
        Assert.Equal(LabPriority.Urgent, result.Priority);
        Assert.Equal(LabOrderStatus.Ordered, result.Status);

        _labOrderRepoMock.Verify(r => r.AddAsync(It.IsAny<LabOrder>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RecordLabResultAsync_WhenAbnormal_SendsAlertEmailNotification()
    {
        // Arrange
        var dto = new RecordLabResultDto
        {
            LabOrderId = 50,
            LabTestId = 101,
            ResultValue = "180 mg/dL",
            IsAbnormal = true,
            PerformedBy = "Lab Tech Alex",
            Remarks = "High blood sugar alert"
        };

        var patient = Patient.Create("Bruce", "Wayne", new DateTime(1980, 1, 1), "Male", "123", "bruce@waynecorp.com", "Gotham").SetId(1);
        var test = LabTest.Create("GLU", "Fasting Glucose", "Metabolic", "70-99", "mg/dL", 30m).SetId(101);
        var order = LabOrder.Create(1, 2, LabPriority.Routine, new[] { 101 }).SetId(50);
        order.Patient = patient;

        _labOrderRepoMock.Setup(r => r.GetByIdAsync(50, It.IsAny<CancellationToken>())).ReturnsAsync(order);
        _labTestRepoMock.Setup(r => r.GetByIdAsync(101, It.IsAny<CancellationToken>())).ReturnsAsync(test);

        _labResultRepoMock.Setup(r => r.AddAsync(It.IsAny<LabResult>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((LabResult r, CancellationToken _) =>
            {
                r.SetId(999);
                r.LabTest = test;
                return r;
            });

        // Act
        var result = await _service.RecordLabResultAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsAbnormal);
        Assert.Equal("180 mg/dL", result.ResultValue);

        _emailServiceMock.Verify(e => e.SendLabResultReadyAsync(It.Is<LabResultNotificationDto>(n =>
            n.LabOrderId == 50 &&
            n.IsAbnormal == true &&
            n.PatientEmail == "bruce@waynecorp.com"
        ), It.IsAny<CancellationToken>()), Times.Once);
    }
}
