namespace HospitalManagement.Domain.Enums;

public enum AppointmentStatus
{
    Scheduled = 1,
    Completed = 2,
    Cancelled = 3
}

public enum UserRole
{
    Staff = 1,
    Admin = 2,
    Doctor = 3,
    Pharmacist = 4,
    Laboratorian = 5,
    Cashier = 6
}

public enum DosageForm
{
    Tablet = 1,
    Capsule = 2,
    Syrup = 3,
    Injection = 4,
    Ointment = 5,
    Drops = 6,
    Inhaler = 7
}

public enum DispensingStatus
{
    Pending = 1,
    Dispensed = 2,
    Cancelled = 3
}

public enum LabPriority
{
    Routine = 1,
    Urgent = 2,
    Stat = 3
}

public enum LabOrderStatus
{
    Ordered = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4
}

public enum InvoiceStatus
{
    Draft = 1,
    Pending = 2,
    PartiallyPaid = 3,
    Paid = 4,
    Cancelled = 5
}

public enum PaymentMethod
{
    Cash = 1,
    CreditCard = 2,
    DebitCard = 3,
    InsuranceClaim = 4,
    BankTransfer = 5
}
