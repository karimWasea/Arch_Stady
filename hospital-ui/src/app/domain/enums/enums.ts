// ============================================================
// Domain Layer — Enums
// Pure TypeScript, zero Angular dependencies
// ============================================================

export enum UserRole {
  Staff = 1,
  Admin = 2,
  Doctor = 3,
  Pharmacist = 4,
  Laboratorian = 5,
  Cashier = 6
}

export enum AppointmentStatus {
  Scheduled = 1,
  Completed = 2,
  Cancelled = 3
}

export enum DosageForm {
  Tablet = 1,
  Capsule = 2,
  Syrup = 3,
  Injection = 4,
  Ointment = 5,
  Drops = 6,
  Inhaler = 7
}

export enum DispensingStatus {
  Pending = 1,
  Dispensed = 2,
  Cancelled = 3
}

export enum LabPriority {
  Routine = 1,
  Urgent = 2,
  Stat = 3
}

export enum LabOrderStatus {
  Ordered = 1,
  InProgress = 2,
  Completed = 3,
  Cancelled = 4
}

export enum InvoiceStatus {
  Draft = 1,
  Pending = 2,
  PartiallyPaid = 3,
  Paid = 4,
  Cancelled = 5
}

export enum PaymentMethod {
  Cash = 1,
  CreditCard = 2,
  DebitCard = 3,
  InsuranceClaim = 4,
  BankTransfer = 5
}

// Display name helpers
export const DosageFormNames: Record<DosageForm, string> = {
  [DosageForm.Tablet]: 'Tablet',
  [DosageForm.Capsule]: 'Capsule',
  [DosageForm.Syrup]: 'Syrup',
  [DosageForm.Injection]: 'Injection',
  [DosageForm.Ointment]: 'Ointment',
  [DosageForm.Drops]: 'Drops',
  [DosageForm.Inhaler]: 'Inhaler'
};

export const LabPriorityNames: Record<LabPriority, string> = {
  [LabPriority.Routine]: 'Routine',
  [LabPriority.Urgent]: 'Urgent',
  [LabPriority.Stat]: 'Stat'
};

export const InvoiceStatusNames: Record<InvoiceStatus, string> = {
  [InvoiceStatus.Draft]: 'Draft',
  [InvoiceStatus.Pending]: 'Pending',
  [InvoiceStatus.PartiallyPaid]: 'Partially Paid',
  [InvoiceStatus.Paid]: 'Paid',
  [InvoiceStatus.Cancelled]: 'Cancelled'
};

export const PaymentMethodNames: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Cash',
  [PaymentMethod.CreditCard]: 'Credit Card',
  [PaymentMethod.DebitCard]: 'Debit Card',
  [PaymentMethod.InsuranceClaim]: 'Insurance Claim',
  [PaymentMethod.BankTransfer]: 'Bank Transfer'
};
