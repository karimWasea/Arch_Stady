using FluentValidation;
using HospitalManagement.Core.DTOs.Appointment;
using HospitalManagement.Core.DTOs.Doctor;
using HospitalManagement.Core.DTOs.MedicalRecord;
using HospitalManagement.Core.DTOs.Patient;
using HospitalManagement.Core.DTOs.Prescription;

namespace HospitalManagement.Core.Validators;

public class CreatePatientDtoValidator : AbstractValidator<CreatePatientDto>
{
    public CreatePatientDtoValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required.")
            .MaximumLength(100);

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required.")
            .MaximumLength(100);

        RuleFor(x => x.DateOfBirth)
            .NotEmpty().WithMessage("Date of birth is required.")
            .LessThan(DateTime.UtcNow).WithMessage("Date of birth must be in the past.");

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Phone number is required.")
            .MaximumLength(20);

        RuleFor(x => x.Email)
            .EmailAddress().When(x => !string.IsNullOrEmpty(x.Email))
            .WithMessage("Invalid email format.");
    }
}

public class CreateDoctorDtoValidator : AbstractValidator<CreateDoctorDto>
{
    public CreateDoctorDtoValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required.")
            .MaximumLength(100);

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Specialization)
            .NotEmpty().WithMessage("Specialization is required.")
            .MaximumLength(150);

        RuleFor(x => x.DepartmentId)
            .GreaterThan(0).WithMessage("DepartmentId must be a valid positive integer.");

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Phone is required.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email address.");
    }
}

public class CreateAppointmentDtoValidator : AbstractValidator<CreateAppointmentDto>
{
    public CreateAppointmentDtoValidator()
    {
        RuleFor(x => x.PatientId)
            .GreaterThan(0).WithMessage("PatientId is required.");

        RuleFor(x => x.DoctorId)
            .GreaterThan(0).WithMessage("DoctorId is required.");

        RuleFor(x => x.AppointmentDate)
            .NotEmpty().WithMessage("AppointmentDate is required.");
    }
}

public class CreatePrescriptionDtoValidator : AbstractValidator<CreatePrescriptionDto>
{
    public CreatePrescriptionDtoValidator()
    {
        RuleFor(x => x.PatientId)
            .GreaterThan(0).WithMessage("PatientId is required.");

        RuleFor(x => x.DoctorId)
            .GreaterThan(0).WithMessage("DoctorId is required.");

        RuleFor(x => x.Items)
            .NotNull().WithMessage("Prescription items collection cannot be null.")
            .Must(items => items != null && items.Count > 0)
            .WithMessage("A Prescription must contain at least one PrescriptionItem.");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.MedicationName).NotEmpty().WithMessage("Medication name is required.");
            item.RuleFor(i => i.Dosage).NotEmpty().WithMessage("Dosage is required.");
            item.RuleFor(i => i.Frequency).NotEmpty().WithMessage("Frequency is required.");
            item.RuleFor(i => i.Duration).NotEmpty().WithMessage("Duration is required.");
        });
    }
}

public class CreateMedicalRecordDtoValidator : AbstractValidator<CreateMedicalRecordDto>
{
    public CreateMedicalRecordDtoValidator()
    {
        RuleFor(x => x.PatientId)
            .GreaterThan(0).WithMessage("PatientId is required.");

        RuleFor(x => x.DoctorId)
            .GreaterThan(0).WithMessage("DoctorId is required.");

        RuleFor(x => x.Diagnosis)
            .NotEmpty().WithMessage("Diagnosis is required.")
            .MaximumLength(300);

        RuleFor(x => x.Symptoms)
            .NotEmpty().WithMessage("Symptoms are required.")
            .MaximumLength(1000);

        RuleFor(x => x.Treatment)
            .NotEmpty().WithMessage("Treatment is required.")
            .MaximumLength(1000);
    }
}
