// ============================================================
// Domain Layer — Billing Models
// Pure TypeScript interfaces, zero Angular dependencies
// ============================================================

import { InvoiceStatus, PaymentMethod } from '../enums/enums';

// ── Insurance ────────────────────────────────────────────────
export interface Insurance {
  id: number;
  patientId: number;
  patientName: string;
  providerName: string;
  policyNumber: string;
  coveragePercentage: number;
  maxCoverageAmount: number;
  expiryDate: string;
  isActive: boolean;
}

export interface CreateInsuranceDto {
  patientId: number;
  providerName: string;
  policyNumber: string;
  coveragePercentage: number;
  maxCoverageAmount: number;
  expiryDate: string;
}

export interface UpdateInsuranceDto extends CreateInsuranceDto {
  isActive: boolean;
}

// ── Invoice ──────────────────────────────────────────────────
export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreateInvoiceItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  patientId: number;
  patientName: string;
  appointmentId?: number;
  issueDate: string;
  dueDate: string;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  insuranceCoverageAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  statusName: string;
  items: InvoiceItem[];
  payments: Payment[];
}

export interface CreateInvoiceDto {
  patientId: number;
  appointmentId?: number;
  taxPercentage: number;
  discountAmount: number;
  applyInsurance: boolean;
  items: CreateInvoiceItemDto[];
}

// ── Payment ──────────────────────────────────────────────────
export interface Payment {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentMethodName: string;
  transactionReference?: string;
  notes?: string;
}

export interface RecordPaymentDto {
  invoiceId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
}
