using HospitalManagement.Domain.Entities.Billing;
using HospitalManagement.Domain.Entities.Laboratory;
using HospitalManagement.Domain.Entities.Pharmacy;
using HospitalManagement.Domain.Enums;
using HospitalManagement.Domain.Exceptions;

namespace HospitalManagement.Domain.Entities.Clinical;

/// <summary>
/// Domain Entity for medical specialties and hospital departments.
/// </summary>
public class Department
{
    public int Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    public ICollection<Doctor> Doctors { get; set; } = new List<Doctor>();

    protected Department() { }

    public static Department Create(string name, string? description = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new BusinessRuleException("Department name cannot be empty.");

        return new Department
        {
            Name = name.Trim(),
            Description = description?.Trim()
        };
    }

    public void Update(string name, string? description = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new BusinessRuleException("Department name cannot be empty.");

        Name = name.Trim();
        Description = description?.Trim();
    }
}

/// <summary>
/// Domain Entity for licensed clinical medical specialists.
/// </summary>
public class Doctor
{
    public int Id { get; private set; }
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string Specialization { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public int DepartmentId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Department? Department { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<MedicalRecord> MedicalRecords { get; set; } = new List<MedicalRecord>();
    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
    public ICollection<LabOrder> LabOrders { get; set; } = new List<LabOrder>();

    protected Doctor() { }

    public static Doctor Create(
        string firstName,
        string lastName,
        string specialization,
        string phone,
        string email,
        int departmentId)
    {
        if (string.IsNullOrWhiteSpace(firstName))
            throw new BusinessRuleException("Doctor first name cannot be empty.");

        if (string.IsNullOrWhiteSpace(lastName))
            throw new BusinessRuleException("Doctor last name cannot be empty.");

        if (string.IsNullOrWhiteSpace(specialization))
            throw new BusinessRuleException("Doctor specialization cannot be empty.");

        if (string.IsNullOrWhiteSpace(email))
            throw new BusinessRuleException("Doctor email cannot be empty.");

        if (departmentId <= 0)
            throw new BusinessRuleException("Department ID must be greater than zero.");

        return new Doctor
        {
            FirstName = firstName.Trim(),
            LastName = lastName.Trim(),
            Specialization = specialization.Trim(),
            Phone = phone?.Trim() ?? string.Empty,
            Email = email.Trim().ToLowerInvariant(),
            DepartmentId = departmentId,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(
        string firstName,
        string lastName,
        string specialization,
        string phone,
        string email,
        int departmentId)
    {
        if (string.IsNullOrWhiteSpace(firstName))
            throw new BusinessRuleException("Doctor first name cannot be empty.");

        if (string.IsNullOrWhiteSpace(lastName))
            throw new BusinessRuleException("Doctor last name cannot be empty.");

        if (string.IsNullOrWhiteSpace(specialization))
            throw new BusinessRuleException("Doctor specialization cannot be empty.");

        if (string.IsNullOrWhiteSpace(email))
            throw new BusinessRuleException("Doctor email cannot be empty.");

        if (departmentId <= 0)
            throw new BusinessRuleException("Department ID must be greater than zero.");

        FirstName = firstName.Trim();
        LastName = lastName.Trim();
        Specialization = specialization.Trim();
        Phone = phone?.Trim() ?? string.Empty;
        Email = email.Trim().ToLowerInvariant();
        DepartmentId = departmentId;
    }
}

/// <summary>
/// Domain Entity for hospital patients.
/// Enforces patient demographic invariants.
/// </summary>
public class Patient
{
    public int Id { get; private set; }
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public DateTime DateOfBirth { get; private set; }
    public string Gender { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string Address { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<MedicalRecord> MedicalRecords { get; set; } = new List<MedicalRecord>();
    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
    public ICollection<DispensingOrder> DispensingOrders { get; set; } = new List<DispensingOrder>();
    public ICollection<LabOrder> LabOrders { get; set; } = new List<LabOrder>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<Insurance> Insurances { get; set; } = new List<Insurance>();

    protected Patient() { }

    public static Patient Create(
        string firstName,
        string lastName,
        DateTime dateOfBirth,
        string gender,
        string phone,
        string email,
        string address)
    {
        if (string.IsNullOrWhiteSpace(firstName))
            throw new BusinessRuleException("Patient first name cannot be empty.");

        if (string.IsNullOrWhiteSpace(lastName))
            throw new BusinessRuleException("Patient last name cannot be empty.");

        if (dateOfBirth >= DateTime.UtcNow)
            throw new BusinessRuleException("Date of birth must be in the past.");

        return new Patient
        {
            FirstName = firstName.Trim(),
            LastName = lastName.Trim(),
            DateOfBirth = dateOfBirth,
            Gender = string.IsNullOrWhiteSpace(gender) ? "Unknown" : gender.Trim(),
            Phone = phone?.Trim() ?? string.Empty,
            Email = email?.Trim().ToLowerInvariant() ?? string.Empty,
            Address = address?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(
        string firstName,
        string lastName,
        DateTime dateOfBirth,
        string gender,
        string phone,
        string email,
        string address)
    {
        if (string.IsNullOrWhiteSpace(firstName))
            throw new BusinessRuleException("Patient first name cannot be empty.");

        if (string.IsNullOrWhiteSpace(lastName))
            throw new BusinessRuleException("Patient last name cannot be empty.");

        if (dateOfBirth >= DateTime.UtcNow)
            throw new BusinessRuleException("Date of birth must be in the past.");

        FirstName = firstName.Trim();
        LastName = lastName.Trim();
        DateOfBirth = dateOfBirth;
        Gender = string.IsNullOrWhiteSpace(gender) ? "Unknown" : gender.Trim();
        Phone = phone?.Trim() ?? string.Empty;
        Email = email?.Trim().ToLowerInvariant() ?? string.Empty;
        Address = address?.Trim() ?? string.Empty;
    }
}

/// <summary>
/// Domain Aggregate Root for clinical patient-doctor consultations.
/// Protects future booking invariants and appointment lifecycle state transitions.
/// </summary>
public class Appointment
{
    public int Id { get; private set; }
    public int PatientId { get; private set; }
    public int DoctorId { get; private set; }
    public DateTime AppointmentDate { get; private set; }
    public AppointmentStatus Status { get; private set; } = AppointmentStatus.Scheduled;
    public string? Notes { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public ICollection<MedicalRecord> MedicalRecords { get; set; } = new List<MedicalRecord>();
    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    protected Appointment() { }

    public static Appointment Create(
        int patientId,
        int doctorId,
        DateTime appointmentDate,
        string? notes = null)
    {
        if (patientId <= 0)
            throw new BusinessRuleException("Patient ID must be greater than zero.");

        if (doctorId <= 0)
            throw new BusinessRuleException("Doctor ID must be greater than zero.");

        if (appointmentDate < DateTime.UtcNow.AddMinutes(-5))
            throw new BusinessRuleException("Appointment date cannot be scheduled in the past.");

        return new Appointment
        {
            PatientId = patientId,
            DoctorId = doctorId,
            AppointmentDate = appointmentDate,
            Notes = notes?.Trim(),
            Status = AppointmentStatus.Scheduled,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Reschedule(DateTime newDate, string? notes = null)
    {
        if (Status != AppointmentStatus.Scheduled)
            throw new BusinessRuleException($"Cannot reschedule an appointment with status '{Status}'. Only scheduled appointments can be rescheduled.");

        if (newDate < DateTime.UtcNow.AddMinutes(-5))
            throw new BusinessRuleException("Rescheduled appointment date must be in the future.");

        AppointmentDate = newDate;
        if (notes != null)
            Notes = notes.Trim();
    }

    public void Cancel()
    {
        if (Status == AppointmentStatus.Completed)
            throw new BusinessRuleException("Cannot cancel an appointment that is already completed.");

        if (Status == AppointmentStatus.Cancelled)
            throw new BusinessRuleException("Appointment is already cancelled.");

        Status = AppointmentStatus.Cancelled;
    }

    public void Complete()
    {
        if (Status == AppointmentStatus.Cancelled)
            throw new BusinessRuleException("Cannot complete an appointment that has been cancelled.");

        if (Status == AppointmentStatus.Completed)
            throw new BusinessRuleException("Appointment is already completed.");

        Status = AppointmentStatus.Completed;
    }
}

/// <summary>
/// Domain Entity representing a clinical patient encounter, symptoms, diagnosis, and treatment.
/// </summary>
public class MedicalRecord
{
    public int Id { get; private set; }
    public int PatientId { get; private set; }
    public int DoctorId { get; private set; }
    public int? AppointmentId { get; private set; }
    public string Diagnosis { get; private set; } = string.Empty;
    public string Symptoms { get; private set; } = string.Empty;
    public string Treatment { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public Appointment? Appointment { get; set; }

    protected MedicalRecord() { }

    public static MedicalRecord Create(
        int patientId,
        int doctorId,
        int? appointmentId,
        string diagnosis,
        string symptoms,
        string treatment,
        string? notes = null)
    {
        if (patientId <= 0)
            throw new BusinessRuleException("Patient ID must be greater than zero.");

        if (doctorId <= 0)
            throw new BusinessRuleException("Doctor ID must be greater than zero.");

        if (string.IsNullOrWhiteSpace(diagnosis))
            throw new BusinessRuleException("Clinical diagnosis cannot be empty.");

        if (string.IsNullOrWhiteSpace(symptoms))
            throw new BusinessRuleException("Reported symptoms cannot be empty.");

        if (string.IsNullOrWhiteSpace(treatment))
            throw new BusinessRuleException("Treatment plan cannot be empty.");

        return new MedicalRecord
        {
            PatientId = patientId,
            DoctorId = doctorId,
            AppointmentId = appointmentId,
            Diagnosis = diagnosis.Trim(),
            Symptoms = symptoms.Trim(),
            Treatment = treatment.Trim(),
            Notes = notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(string diagnosis, string symptoms, string treatment, string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(diagnosis))
            throw new BusinessRuleException("Clinical diagnosis cannot be empty.");

        if (string.IsNullOrWhiteSpace(symptoms))
            throw new BusinessRuleException("Reported symptoms cannot be empty.");

        if (string.IsNullOrWhiteSpace(treatment))
            throw new BusinessRuleException("Treatment plan cannot be empty.");

        Diagnosis = diagnosis.Trim();
        Symptoms = symptoms.Trim();
        Treatment = treatment.Trim();
        Notes = notes?.Trim();
    }
}

/// <summary>
/// Domain Aggregate Root for pharmacological prescriptions issued to a patient.
/// Protects item completeness and dosing schedule invariants.
/// </summary>
public class Prescription
{
    public int Id { get; private set; }
    public int PatientId { get; private set; }
    public int DoctorId { get; private set; }
    public int? AppointmentId { get; private set; }
    public DateTime PrescriptionDate { get; private set; } = DateTime.UtcNow;
    public string? Notes { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public Appointment? Appointment { get; set; }

    private readonly List<PrescriptionItem> _prescriptionItems = new();
    public IReadOnlyCollection<PrescriptionItem> PrescriptionItems => _prescriptionItems.AsReadOnly();
    public ICollection<DispensingOrder> DispensingOrders { get; set; } = new List<DispensingOrder>();

    protected Prescription() { }

    public static Prescription Create(
        int patientId,
        int doctorId,
        int? appointmentId,
        IEnumerable<PrescriptionItem> items,
        string? notes = null,
        DateTime? prescriptionDate = null)
    {
        if (patientId <= 0)
            throw new BusinessRuleException("Patient ID must be greater than zero.");

        if (doctorId <= 0)
            throw new BusinessRuleException("Doctor ID must be greater than zero.");

        var itemList = items?.ToList() ?? new List<PrescriptionItem>();
        if (itemList.Count == 0)
            throw new BusinessRuleException("A prescription must contain at least one medication item.");

        var prescription = new Prescription
        {
            PatientId = patientId,
            DoctorId = doctorId,
            AppointmentId = appointmentId,
            Notes = notes?.Trim(),
            PrescriptionDate = prescriptionDate ?? DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        prescription._prescriptionItems.AddRange(itemList);
        return prescription;
    }

    public void Update(string? notes, IEnumerable<PrescriptionItem> items)
    {
        var itemList = items?.ToList() ?? new List<PrescriptionItem>();
        if (itemList.Count == 0)
            throw new BusinessRuleException("A prescription must contain at least one medication item.");

        Notes = notes?.Trim();
        _prescriptionItems.Clear();
        _prescriptionItems.AddRange(itemList);
    }
}

/// <summary>
/// Child entity of Prescription aggregate.
/// Represents a medication dosing instruction.
/// </summary>
public class PrescriptionItem
{
    public int Id { get; private set; }
    public int PrescriptionId { get; private set; }
    public string MedicationName { get; private set; } = string.Empty;
    public string Dosage { get; private set; } = string.Empty;
    public string Frequency { get; private set; } = string.Empty;
    public string Duration { get; private set; } = string.Empty;
    public string? Instructions { get; private set; }

    public Prescription? Prescription { get; set; }

    protected PrescriptionItem() { }

    public static PrescriptionItem Create(
        string medicationName,
        string dosage,
        string frequency,
        string duration,
        string? instructions = null)
    {
        if (string.IsNullOrWhiteSpace(medicationName))
            throw new BusinessRuleException("Medication name cannot be empty.");

        if (string.IsNullOrWhiteSpace(dosage))
            throw new BusinessRuleException("Dosage instructions cannot be empty.");

        if (string.IsNullOrWhiteSpace(frequency))
            throw new BusinessRuleException("Dosing frequency cannot be empty.");

        if (string.IsNullOrWhiteSpace(duration))
            throw new BusinessRuleException("Prescription duration cannot be empty.");

        return new PrescriptionItem
        {
            MedicationName = medicationName.Trim(),
            Dosage = dosage.Trim(),
            Frequency = frequency.Trim(),
            Duration = duration.Trim(),
            Instructions = instructions?.Trim()
        };
    }
}

/// <summary>
/// Domain Entity for authenticated healthcare system user.
/// </summary>
public class User
{
    public int Id { get; private set; }
    public string Username { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string FullName { get; private set; } = string.Empty;
    public byte[] PasswordHash { get; private set; } = Array.Empty<byte>();
    public byte[] PasswordSalt { get; private set; } = Array.Empty<byte>();
    public UserRole Role { get; private set; } = UserRole.Staff;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    protected User() { }

    public static User Create(
        string username,
        string email,
        string fullName,
        byte[] passwordHash,
        byte[] passwordSalt,
        UserRole role)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new BusinessRuleException("Username cannot be empty.");

        if (string.IsNullOrWhiteSpace(email))
            throw new BusinessRuleException("Email cannot be empty.");

        return new User
        {
            Username = username.Trim(),
            Email = email.Trim().ToLowerInvariant(),
            FullName = fullName?.Trim() ?? username.Trim(),
            PasswordHash = passwordHash,
            PasswordSalt = passwordSalt,
            Role = role,
            CreatedAt = DateTime.UtcNow
        };
    }
}
