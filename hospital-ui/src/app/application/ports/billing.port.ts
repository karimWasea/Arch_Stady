// ============================================================
// Application Layer — Billing Service Port
// ============================================================

import { Observable } from 'rxjs';
import { ApiResponse } from '../../domain/models/auth.models';
import {
  Insurance, CreateInsuranceDto, UpdateInsuranceDto,
  Invoice, CreateInvoiceDto,
  Payment, RecordPaymentDto
} from '../../domain/models/billing.models';

export abstract class BillingServicePort {
  // ── Insurance ────────────────────────────────────────────
  abstract getInsurances(): Observable<ApiResponse<Insurance[]>>;
  abstract getInsuranceByPatient(patientId: number): Observable<ApiResponse<Insurance>>;
  abstract createInsurance(dto: CreateInsuranceDto): Observable<ApiResponse<Insurance>>;
  abstract updateInsurance(id: number, dto: UpdateInsuranceDto): Observable<ApiResponse<Insurance>>;

  // ── Invoices ─────────────────────────────────────────────
  abstract getInvoices(): Observable<ApiResponse<Invoice[]>>;
  abstract getInvoice(id: number): Observable<ApiResponse<Invoice>>;
  abstract getInvoicesByPatient(patientId: number): Observable<ApiResponse<Invoice[]>>;
  abstract createInvoice(dto: CreateInvoiceDto): Observable<ApiResponse<Invoice>>;

  // ── Payments ─────────────────────────────────────────────
  abstract getPaymentsByInvoice(invoiceId: number): Observable<ApiResponse<Payment[]>>;
  abstract recordPayment(dto: RecordPaymentDto): Observable<ApiResponse<Payment>>;
}
