using FluentValidation;
using HospitalManagement.Application;
using HospitalManagement.Application.DTOs.Auth;
using HospitalManagement.Application.DTOs.Billing;
using HospitalManagement.Application.DTOs.Clinical;
using HospitalManagement.Application.DTOs.Laboratory;
using HospitalManagement.Application.DTOs.Pharmacy;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalManagement.Tests;

public class ValidatorDependencyInjectionTests
{
    private readonly IServiceProvider _serviceProvider;

    public ValidatorDependencyInjectionTests()
    {
        var services = new ServiceCollection();
        services.AddApplication();
        _serviceProvider = services.BuildServiceProvider();
    }

    [Fact]
    public void RegisterRequestDtoValidator_ShouldBeResolvableFromDI()
    {
        var validator = _serviceProvider.GetService<IValidator<RegisterRequestDto>>();
        Assert.NotNull(validator);
    }

    [Fact]
    public void AllControllerValidators_ShouldBeResolvableFromDI()
    {
        Assert.NotNull(_serviceProvider.GetService<IValidator<LoginRequestDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<RegisterRequestDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreatePatientDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreateDoctorDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreateDepartmentDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreateAppointmentDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreateMedicalRecordDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreatePrescriptionDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreateMedicineDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<AddStockDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<DispenseOrderRequestDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreateLabTestDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreateLabOrderDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<RecordLabResultDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreateInsuranceDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<CreateInvoiceDto>>());
        Assert.NotNull(_serviceProvider.GetService<IValidator<RecordPaymentDto>>());
    }
}
