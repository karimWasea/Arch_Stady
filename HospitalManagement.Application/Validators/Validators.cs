using FluentValidation;
using HospitalManagement.Application.DTOs.Auth;
using HospitalManagement.Application.DTOs.Billing;
using HospitalManagement.Application.DTOs.Clinical;
using HospitalManagement.Application.DTOs.Laboratory;
using HospitalManagement.Application.DTOs.Pharmacy;

namespace HospitalManagement.Application.Validators;

public class CreatePatientDtoValidator : AbstractValidator<CreatePatientDto>
{
    public CreatePatientDtoValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(20);
        RuleFor(x => x.DateOfBirth).LessThan(DateTime.UtcNow).WithMessage("Date of birth must be in the past.");
    }
}

public class CreateDoctorDtoValidator : AbstractValidator<CreateDoctorDto>
{
    public CreateDoctorDtoValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Specialization).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.DepartmentId).GreaterThan(0);
    }
}

public class CreateDepartmentDtoValidator : AbstractValidator<CreateDepartmentDto>
{
    public CreateDepartmentDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}

public class CreateAppointmentDtoValidator : AbstractValidator<CreateAppointmentDto>
{
    public CreateAppointmentDtoValidator()
    {
        RuleFor(x => x.PatientId).GreaterThan(0);
        RuleFor(x => x.DoctorId).GreaterThan(0);
        RuleFor(x => x.AppointmentDate).GreaterThan(DateTime.UtcNow.AddMinutes(-5))
            .WithMessage("Appointment date must be in the future.");
    }
}

public class CreateMedicalRecordDtoValidator : AbstractValidator<CreateMedicalRecordDto>
{
    public CreateMedicalRecordDtoValidator()
    {
        RuleFor(x => x.PatientId).GreaterThan(0);
        RuleFor(x => x.DoctorId).GreaterThan(0);
        RuleFor(x => x.Diagnosis).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Symptoms).NotEmpty();
        RuleFor(x => x.Treatment).NotEmpty();
    }
}

public class CreatePrescriptionDtoValidator : AbstractValidator<CreatePrescriptionDto>
{
    public CreatePrescriptionDtoValidator()
    {
        RuleFor(x => x.PatientId).GreaterThan(0);
        RuleFor(x => x.DoctorId).GreaterThan(0);
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one prescription item is required.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.MedicationName).NotEmpty().MaximumLength(100);
            item.RuleFor(i => i.Dosage).NotEmpty().MaximumLength(50);
            item.RuleFor(i => i.Frequency).NotEmpty().MaximumLength(50);
            item.RuleFor(i => i.Duration).NotEmpty().MaximumLength(50);
        });
    }
}

public class LoginRequestDtoValidator : AbstractValidator<LoginRequestDto>
{
    public LoginRequestDtoValidator()
    {
        RuleFor(x => x.UsernameOrEmail).NotEmpty();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

public class RegisterRequestDtoValidator : AbstractValidator<RegisterRequestDto>
{
    public RegisterRequestDtoValidator()
    {
        RuleFor(x => x.Username).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Role).IsInEnum();
    }
}

public class CreateMedicineDtoValidator : AbstractValidator<CreateMedicineDto>
{
    public CreateMedicineDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Sku).NotEmpty().MaximumLength(50);
        RuleFor(x => x.UnitPrice).GreaterThan(0).WithMessage("Unit price must be greater than zero.");
    }
}

public class AddStockDtoValidator : AbstractValidator<AddStockDto>
{
    public AddStockDtoValidator()
    {
        RuleFor(x => x.MedicineId).GreaterThan(0);
        RuleFor(x => x.BatchNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.ExpiryDate).GreaterThan(DateTime.UtcNow).WithMessage("Expiry date must be in the future.");
    }
}

public class DispenseOrderRequestDtoValidator : AbstractValidator<DispenseOrderRequestDto>
{
    public DispenseOrderRequestDtoValidator()
    {
        RuleFor(x => x.PatientId).GreaterThan(0);
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one medicine item must be specified.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.MedicineId).GreaterThan(0);
            item.RuleFor(i => i.Quantity).GreaterThan(0);
        });
    }
}

public class CreateLabTestDtoValidator : AbstractValidator<CreateLabTestDto>
{
    public CreateLabTestDtoValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
    }
}

public class CreateLabOrderDtoValidator : AbstractValidator<CreateLabOrderDto>
{
    public CreateLabOrderDtoValidator()
    {
        RuleFor(x => x.PatientId).GreaterThan(0);
        RuleFor(x => x.DoctorId).GreaterThan(0);
        RuleFor(x => x.TestIds).NotEmpty().WithMessage("At least one lab test must be selected.");
    }
}

public class RecordLabResultDtoValidator : AbstractValidator<RecordLabResultDto>
{
    public RecordLabResultDtoValidator()
    {
        RuleFor(x => x.LabOrderId).GreaterThan(0);
        RuleFor(x => x.LabTestId).GreaterThan(0);
        RuleFor(x => x.ResultValue).NotEmpty();
        RuleFor(x => x.PerformedBy).NotEmpty().MaximumLength(100);
    }
}

public class CreateInsuranceDtoValidator : AbstractValidator<CreateInsuranceDto>
{
    public CreateInsuranceDtoValidator()
    {
        RuleFor(x => x.PatientId).GreaterThan(0);
        RuleFor(x => x.ProviderName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.PolicyNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.CoveragePercentage).InclusiveBetween(0, 100);
        RuleFor(x => x.MaxCoverageAmount).GreaterThan(0);
        RuleFor(x => x.ExpiryDate).GreaterThan(DateTime.UtcNow).WithMessage("Expiry date must be in the future.");
    }
}

public class CreateInvoiceDtoValidator : AbstractValidator<CreateInvoiceDto>
{
    public CreateInvoiceDtoValidator()
    {
        RuleFor(x => x.PatientId).GreaterThan(0);
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one invoice line item is required.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Description).NotEmpty();
            item.RuleFor(i => i.Quantity).GreaterThan(0);
            item.RuleFor(i => i.UnitPrice).GreaterThanOrEqualTo(0);
        });
    }
}

public class RecordPaymentDtoValidator : AbstractValidator<RecordPaymentDto>
{
    public RecordPaymentDtoValidator()
    {
        RuleFor(x => x.InvoiceId).GreaterThan(0);
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Payment amount must be greater than zero.");
    }
}
