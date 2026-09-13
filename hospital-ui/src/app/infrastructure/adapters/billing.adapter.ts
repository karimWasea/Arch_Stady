// ============================================================
// Infrastructure Layer — Billing Adapter
// ============================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BillingServicePort } from '../../application/ports/billing.port';
import { ApiResponse } from '../../domain/models/auth.models';
import {
  Insurance, CreateInsuranceDto, UpdateInsuranceDto,
  Invoice, CreateInvoiceDto,
  Payment, RecordPaymentDto
} from '../../domain/models/billing.models';

@Injectable()
export class BillingAdapter extends BillingServicePort {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/billing`;

  // ── Insurance ────────────────────────────────────────────
  getInsurances(): Observable<ApiResponse<Insurance[]>> {
    return this.http.get<ApiResponse<Insurance[]>>(`${this.api}/insurance`);
  }
  getInsuranceByPatient(patientId: number): Observable<ApiResponse<Insurance>> {
    return this.http.get<ApiResponse<Insurance>>(`${this.api}/insurance/patient/${patientId}`);
  }
  createInsurance(dto: CreateInsuranceDto): Observable<ApiResponse<Insurance>> {
    return this.http.post<ApiResponse<Insurance>>(`${this.api}/insurance`, dto);
  }
  updateInsurance(id: number, dto: UpdateInsuranceDto): Observable<ApiResponse<Insurance>> {
    return this.http.put<ApiResponse<Insurance>>(`${this.api}/insurance/${id}`, dto);
  }

  // ── Invoices ─────────────────────────────────────────────
  getInvoices(): Observable<ApiResponse<Invoice[]>> {
    return this.http.get<ApiResponse<Invoice[]>>(`${this.api}/invoices`);
  }
  getInvoice(id: number): Observable<ApiResponse<Invoice>> {
    return this.http.get<ApiResponse<Invoice>>(`${this.api}/invoices/${id}`);
  }
  getInvoicesByPatient(patientId: number): Observable<ApiResponse<Invoice[]>> {
    return this.http.get<ApiResponse<Invoice[]>>(`${this.api}/invoices/patient/${patientId}`);
  }
  createInvoice(dto: CreateInvoiceDto): Observable<ApiResponse<Invoice>> {
    return this.http.post<ApiResponse<Invoice>>(`${this.api}/invoices`, dto);
  }

  // ── Payments ─────────────────────────────────────────────
  getPaymentsByInvoice(invoiceId: number): Observable<ApiResponse<Payment[]>> {
    return this.http.get<ApiResponse<Payment[]>>(`${this.api}/payments/invoice/${invoiceId}`);
  }
  recordPayment(dto: RecordPaymentDto): Observable<ApiResponse<Payment>> {
    return this.http.post<ApiResponse<Payment>>(`${this.api}/payments`, dto);
  }
}
