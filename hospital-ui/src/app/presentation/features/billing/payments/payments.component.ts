// ============================================================
// Presentation Layer — Payments Component
// Ledger of patient payments, transactions, & receipts
// ============================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BillingServicePort } from '../../../../application/ports/billing.port';
import { Invoice, Payment, RecordPaymentDto } from '../../../../domain/models/billing.models';
import { PaymentMethod, PaymentMethodNames, InvoiceStatus } from '../../../../domain/enums/enums';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="page-container">
      <!-- Header Section -->
      <div class="page-header">
        <div>
          <h1>Payment Transactions</h1>
          <p>Record, audit, and reconcile patient payments, insurance claims, and billing receipts</p>
        </div>
        <button (click)="openRecordModal()" class="btn-primary">
          <span class="btn-icon">💳</span> Record Payment
        </button>
      </div>

      <!-- Alert Notification Banner -->
      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType()">
          <span class="alert-icon">{{ alertType() === 'success' ? '✓' : '⚠️' }}</span>
          <span class="alert-text">{{ alertMessage() }}</span>
          <button (click)="dismissAlert()" class="alert-close">&times;</button>
        </div>
      }

      <!-- Financial Metrics Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrap bg-green">
            <span class="stat-icon">💰</span>
          </div>
          <div>
            <span class="stat-label">Total Collected</span>
            <h3 class="stat-value text-success font-mono">{{ totalCollected() | currency }}</h3>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap bg-blue">
            <span class="stat-icon">📑</span>
          </div>
          <div>
            <span class="stat-label">Total Transactions</span>
            <h3 class="stat-value font-mono">{{ payments().length }}</h3>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap bg-amber">
            <span class="stat-icon">⏳</span>
          </div>
          <div>
            <span class="stat-label">Unpaid / Partial Invoices</span>
            <h3 class="stat-value text-warning font-mono">{{ pendingInvoices().length }}</h3>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap bg-red">
            <span class="stat-icon">⚖️</span>
          </div>
          <div>
            <span class="stat-label">Total Balance Due</span>
            <h3 class="stat-value text-danger font-mono">{{ totalBalanceDue() | currency }}</h3>
          </div>
        </div>
      </div>

      <!-- Main Content Card -->
      <div class="content-card">
        <div class="table-actions">
          <div class="filter-controls">
            <!-- Search Input -->
            <div class="search-wrap">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by invoice #, reference, notes..."
                [value]="searchQuery()"
                (input)="onSearch($event)"
                class="search-input"
              />
            </div>

            <!-- Invoice Selector Filter -->
            <div class="select-wrap">
              <label class="inline-label">Invoice:</label>
              <select [value]="selectedInvoiceId() ?? 'all'" (change)="onInvoiceFilter($event)" class="filter-select">
                <option value="all">All Invoices ({{ invoices().length }})</option>
                @for (inv of invoices(); track inv.id) {
                  <option [value]="inv.id">
                    {{ inv.invoiceNumber }} — {{ inv.patientName }} (Due: {{ inv.balanceDue | currency }})
                  </option>
                }
              </select>
            </div>
          </div>

          <div class="actions-right">
            <span class="count-badge">{{ filteredPayments().length }} Payments</span>
          </div>
        </div>

        <!-- Selected Invoice Highlight Banner -->
        @if (selectedInvoice()) {
          <div class="invoice-summary-banner">
            <div class="banner-title">
              <span class="banner-badge">{{ selectedInvoice()!.invoiceNumber }}</span>
              <span class="banner-patient">{{ selectedInvoice()!.patientName }}</span>
            </div>
            <div class="banner-stats font-mono">
              <span>Total: <strong>{{ selectedInvoice()!.totalAmount | currency }}</strong></span>
              <span>Paid: <strong class="text-success">{{ selectedInvoice()!.paidAmount | currency }}</strong></span>
              <span>Balance: <strong class="text-danger">{{ selectedInvoice()!.balanceDue | currency }}</strong></span>
            </div>
            @if (selectedInvoice()!.balanceDue > 0) {
              <button (click)="openRecordModalForInvoice(selectedInvoice()!)" class="btn-action-mini">
                + Pay Towards This
              </button>
            }
          </div>
        }

        <!-- Table / Empty State -->
        @if (isLoading()) {
          <div class="loading-box">
            <div class="spinner"></div>
            <span>Loading payment records...</span>
          </div>
        } @else if (filteredPayments().length === 0) {
          <div class="empty-box">
            <div class="empty-icon">💳</div>
            <h3>No payments found</h3>
            <p>{{ searchQuery() || selectedInvoiceId() !== null ? 'No payments match the selected criteria.' : 'No payments have been recorded yet.' }}</p>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Invoice #</th>
                  <th>Payment Date</th>
                  <th class="text-right">Amount</th>
                  <th>Payment Method</th>
                  <th>Transaction Reference</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                @for (p of filteredPayments(); track p.id) {
                  <tr>
                    <td class="font-mono text-muted">#{{ p.id }}</td>
                    <td class="font-mono font-semibold text-primary">
                      {{ p.invoiceNumber }}
                    </td>
                    <td>{{ p.paymentDate | date:'medium' }}</td>
                    <td class="text-right font-mono font-bold text-success">
                      {{ p.amount | currency }}
                    </td>
                    <td>
                      <span class="method-badge" [ngClass]="getMethodClass(p.paymentMethod)">
                        <span class="method-dot"></span>
                        {{ getMethodName(p.paymentMethod, p.paymentMethodName) }}
                      </span>
                    </td>
                    <td class="font-mono">
                      @if (p.transactionReference) {
                        <span class="ref-badge">{{ p.transactionReference }}</span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td class="notes-cell">
                      <span [title]="p.notes || ''">{{ p.notes || '—' }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Record Payment Modal -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="onBackdropClick($event)">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="modal-icon">💳</span>
                <div>
                  <h3>Record Patient Payment</h3>
                  <p class="modal-subtitle">Log a financial transaction against an outstanding patient bill</p>
                </div>
              </div>
              <button (click)="closeModal()" class="btn-close" aria-label="Close modal">&times;</button>
            </div>

            <form [formGroup]="paymentForm" (ngSubmit)="onSubmit()" class="modal-form">
              <!-- Invoice Selection -->
              <div class="form-group">
                <label for="invoiceId">Target Invoice <span class="required">*</span></label>
                <select
                  id="invoiceId"
                  formControlName="invoiceId"
                  (change)="onModalInvoiceChange($event)"
                  [class.input-error]="isFieldInvalid('invoiceId')"
                >
                  <option [ngValue]="null" disabled>Select outstanding invoice...</option>
                  @for (inv of payableInvoices(); track inv.id) {
                    <option [ngValue]="inv.id">
                      {{ inv.invoiceNumber }} — {{ inv.patientName }} (Due: {{ inv.balanceDue | currency }})
                    </option>
                  }
                </select>
                @if (isFieldInvalid('invoiceId')) {
                  <span class="field-error">Please select an invoice to record payment against.</span>
                }
              </div>

              <!-- Selected Invoice Quick Info Preview -->
              @if (modalSelectedInvoice()) {
                <div class="modal-invoice-preview">
                  <div class="preview-header">
                    <span class="preview-patient">{{ modalSelectedInvoice()!.patientName }}</span>
                    <span class="preview-inv font-mono">{{ modalSelectedInvoice()!.invoiceNumber }}</span>
                  </div>
                  <div class="preview-stats font-mono">
                    <div>
                      <span class="p-lbl">Total Amount:</span>
                      <span class="p-val">{{ modalSelectedInvoice()!.totalAmount | currency }}</span>
                    </div>
                    <div>
                      <span class="p-lbl">Already Paid:</span>
                      <span class="p-val text-success">{{ modalSelectedInvoice()!.paidAmount | currency }}</span>
                    </div>
                    <div>
                      <span class="p-lbl">Balance Due:</span>
                      <span class="p-val text-danger font-bold">{{ modalSelectedInvoice()!.balanceDue | currency }}</span>
                    </div>
                  </div>
                  <button type="button" (click)="payFullBalance()" class="btn-quick-fill">
                    Pay Full Balance ({{ modalSelectedInvoice()!.balanceDue | currency }})
                  </button>
                </div>
              }

              <!-- Payment Amount & Payment Method Row -->
              <div class="form-row">
                <div class="form-group">
                  <label for="amount">Payment Amount ($) <span class="required">*</span></label>
                  <input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    formControlName="amount"
                    placeholder="0.00"
                    [class.input-error]="isFieldInvalid('amount')"
                  />
                  @if (isFieldInvalid('amount')) {
                    <span class="field-error">A valid positive amount is required.</span>
                  }
                </div>

                <div class="form-group">
                  <label for="paymentMethod">Payment Method <span class="required">*</span></label>
                  <select
                    id="paymentMethod"
                    formControlName="paymentMethod"
                    [class.input-error]="isFieldInvalid('paymentMethod')"
                  >
                    @for (m of methodOptions; track m.value) {
                      <option [ngValue]="m.value">{{ m.label }}</option>
                    }
                  </select>
                  @if (isFieldInvalid('paymentMethod')) {
                    <span class="field-error">Payment method is required.</span>
                  }
                </div>
              </div>

              <!-- Transaction Reference -->
              <div class="form-group">
                <label for="transactionReference">Transaction Reference / Check #</label>
                <input
                  id="transactionReference"
                  type="text"
                  formControlName="transactionReference"
                  placeholder="e.g. TXN-894729, Check #402, Stripe ID"
                />
              </div>

              <!-- Payment Notes -->
              <div class="form-group">
                <label for="notes">Notes & Comments</label>
                <textarea
                  id="notes"
                  formControlName="notes"
                  rows="2"
                  placeholder="e.g. Copay payment collected at reception"
                ></textarea>
              </div>

              <!-- Modal Actions Footer -->
              <div class="modal-actions">
                <button type="button" (click)="closeModal()" class="btn-secondary" [disabled]="isSubmitting()">
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="paymentForm.invalid || isSubmitting()"
                  class="btn-primary"
                >
                  {{ isSubmitting() ? 'Processing...' : 'Confirm Payment' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      color: #f1f5f9;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 0.35rem 0;
      letter-spacing: -0.02em;
    }
    .page-header p {
      color: #94a3b8;
      font-size: 0.925rem;
      margin: 0;
    }

    /* Buttons */
    .btn-primary {
      background: #3b82f6;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
    }
    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-icon {
      font-size: 1.1rem;
      line-height: 1;
    }
    .btn-secondary {
      background: #334155;
      color: #cbd5e1;
      border: 1px solid #475569;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #475569;
      color: #ffffff;
    }
    .btn-action-mini {
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid #3b82f6;
      color: #60a5fa;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-action-mini:hover {
      background: #3b82f6;
      color: white;
    }
    .btn-quick-fill {
      background: rgba(16, 185, 129, 0.15);
      border: 1px dashed rgba(16, 185, 129, 0.4);
      color: #34d399;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      align-self: flex-start;
      margin-top: 0.5rem;
      transition: all 0.2s;
    }
    .btn-quick-fill:hover {
      background: rgba(16, 185, 129, 0.25);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .stats-grid { grid-template-columns: 1fr; }
    }
    .stat-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .stat-icon-wrap {
      width: 46px;
      height: 46px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
    }
    .bg-green { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); }
    .bg-blue { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); }
    .bg-amber { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); }
    .bg-red { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); }

    .stat-label {
      font-size: 0.775rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .stat-value {
      font-size: 1.35rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0.15rem 0 0 0;
    }

    /* Alerts */
    .alert {
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      animation: fadeIn 0.2s ease-in-out;
    }
    .alert.success {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .alert.error {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .alert-icon { font-size: 1rem; }
    .alert-text { flex: 1; }
    .alert-close {
      background: transparent;
      border: none;
      color: currentColor;
      font-size: 1.25rem;
      cursor: pointer;
      opacity: 0.7;
    }
    .alert-close:hover { opacity: 1; }

    /* Content Card */
    .content-card {
      background: #1e293b;
      border-radius: 12px;
      border: 1px solid #334155;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    /* Table Actions */
    .table-actions {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      background: #1e293b;
    }
    .filter-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 320px;
      max-width: 100%;
    }
    .search-icon {
      position: absolute;
      left: 0.85rem;
      color: #64748b;
      font-size: 0.85rem;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 0.55rem 0.85rem 0.55rem 2.4rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .search-input:focus, .filter-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
    .search-input::placeholder { color: #64748b; }
    .select-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .inline-label {
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 600;
    }
    .filter-select {
      padding: 0.55rem 1rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 0.875rem;
      cursor: pointer;
      max-width: 320px;
    }
    .count-badge {
      font-size: 0.8rem;
      background: #0f172a;
      color: #94a3b8;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-weight: 600;
      border: 1px solid #334155;
    }

    /* Selected Invoice Highlight Banner */
    .invoice-summary-banner {
      background: #0f172a;
      padding: 0.85rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .banner-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .banner-badge {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .banner-patient {
      font-weight: 600;
      color: #f1f5f9;
    }
    .banner-stats {
      display: flex;
      gap: 1.5rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    .data-table th {
      background: #0f172a;
      padding: 0.85rem 1.25rem;
      color: #94a3b8;
      font-weight: 600;
      border-bottom: 1px solid #334155;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }
    .data-table td {
      padding: 0.95rem 1.25rem;
      border-bottom: 1px solid #334155;
      color: #f1f5f9;
      vertical-align: middle;
    }
    .data-table tbody tr {
      transition: background 0.15s ease;
    }
    .data-table tbody tr:nth-child(even) {
      background: rgba(15, 23, 42, 0.4);
    }
    .data-table tbody tr:hover {
      background: #334155;
    }

    /* Table details */
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #60a5fa !important; }
    .text-success { color: #34d399 !important; }
    .text-danger { color: #f87171 !important; }
    .text-warning { color: #fbbf24 !important; }
    .text-muted { color: #94a3b8; }
    .text-right { text-align: right; }
    .ref-badge {
      background: #0f172a;
      border: 1px solid #334155;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #cbd5e1;
    }
    .notes-cell {
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #94a3b8;
    }

    /* Method Badges */
    .method-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .method-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    .badge-cash {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-cc {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .badge-dc {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }
    .badge-insurance {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-transfer {
      background: rgba(6, 182, 212, 0.15);
      color: #22d3ee;
      border: 1px solid rgba(6, 182, 212, 0.3);
    }

    /* States */
    .loading-box, .empty-box {
      padding: 4rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: #94a3b8;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #334155;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 0.25rem;
    }
    .empty-box h3 {
      font-size: 1.15rem;
      color: #f1f5f9;
      margin: 0;
    }
    .empty-box p {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1.5rem;
      animation: fadeIn 0.15s ease-out;
    }
    .modal-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      width: 580px;
      max-width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      background: #0f172a;
    }
    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .modal-icon {
      font-size: 1.5rem;
    }
    .modal-header h3 {
      font-size: 1.25rem;
      color: #f1f5f9;
      margin: 0 0 0.2rem 0;
      font-weight: 700;
    }
    .modal-subtitle {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 0;
    }
    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem;
      transition: color 0.15s;
    }
    .btn-close:hover { color: #f1f5f9; }

    /* Modal Form */
    .modal-form {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .modal-invoice-preview {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 0.4rem;
    }
    .preview-patient {
      font-weight: 600;
      color: #f1f5f9;
      font-size: 0.875rem;
    }
    .preview-inv {
      color: #60a5fa;
      font-size: 0.8rem;
    }
    .preview-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }
    .p-lbl {
      color: #64748b;
      display: block;
      margin-bottom: 0.1rem;
    }
    .p-val {
      color: #f1f5f9;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 640px) {
      .form-row { grid-template-columns: 1fr; }
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .required { color: #f87171; }
    .form-group input, .form-group select, .form-group textarea {
      padding: 0.65rem 0.85rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 0.875rem;
      transition: all 0.2s;
      font-family: inherit;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }
    .input-error {
      border-color: #ef4444 !important;
    }
    .field-error {
      color: #f87171;
      font-size: 0.75rem;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid #334155;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class PaymentsComponent implements OnInit {
  private billingService = inject(BillingServicePort);
  private fb = inject(FormBuilder);

  // Reactive state signals
  invoices = signal<Invoice[]>([]);
  payments = signal<Payment[]>([]);
  selectedInvoiceId = signal<number | null>(null);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  showModal = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');
  modalSelectedInvoiceId = signal<number | null>(null);

  // Payment methods list for form
  methodOptions = [
    { value: PaymentMethod.Cash, label: PaymentMethodNames[PaymentMethod.Cash] },
    { value: PaymentMethod.CreditCard, label: PaymentMethodNames[PaymentMethod.CreditCard] },
    { value: PaymentMethod.DebitCard, label: PaymentMethodNames[PaymentMethod.DebitCard] },
    { value: PaymentMethod.InsuranceClaim, label: PaymentMethodNames[PaymentMethod.InsuranceClaim] },
    { value: PaymentMethod.BankTransfer, label: PaymentMethodNames[PaymentMethod.BankTransfer] }
  ];

  // Computed properties
  selectedInvoice = computed(() => {
    const id = this.selectedInvoiceId();
    if (id === null) return null;
    return this.invoices().find(inv => inv.id === id) || null;
  });

  payableInvoices = computed(() => {
    return this.invoices().filter(inv =>
      inv.balanceDue > 0 ||
      inv.status === InvoiceStatus.Pending ||
      inv.status === InvoiceStatus.PartiallyPaid
    );
  });

  modalSelectedInvoice = computed(() => {
    const id = this.modalSelectedInvoiceId();
    if (!id) return null;
    return this.invoices().find(inv => inv.id === id) || null;
  });

  filteredPayments = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const invId = this.selectedInvoiceId();
    const list = this.payments();

    return list.filter(p => {
      const matchesInvoice = invId === null || p.invoiceId === invId;
      const matchesSearch = !query ||
        p.invoiceNumber.toLowerCase().includes(query) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(query)) ||
        (p.paymentMethodName && p.paymentMethodName.toLowerCase().includes(query)) ||
        (p.notes && p.notes.toLowerCase().includes(query));

      return matchesInvoice && matchesSearch;
    });
  });

  totalCollected = computed(() => {
    return this.payments().reduce((sum, p) => sum + (p.amount || 0), 0);
  });

  pendingInvoices = computed(() => {
    return this.invoices().filter(inv =>
      inv.status === InvoiceStatus.Pending || inv.status === InvoiceStatus.PartiallyPaid
    );
  });

  totalBalanceDue = computed(() => {
    return this.invoices().reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
  });

  // Reactive form
  paymentForm: FormGroup = this.initForm();

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): FormGroup {
    return this.fb.group({
      invoiceId: [null, [Validators.required]],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      paymentMethod: [PaymentMethod.Cash, [Validators.required]],
      transactionReference: [''],
      notes: ['']
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    this.billingService.getInvoices().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.invoices.set(res.data);
          // Aggregate all payments across invoices
          const allPayments: Payment[] = [];
          res.data.forEach(inv => {
            if (inv.payments && inv.payments.length > 0) {
              inv.payments.forEach(p => {
                allPayments.push({
                  ...p,
                  invoiceNumber: p.invoiceNumber || inv.invoiceNumber
                });
              });
            }
          });
          // Sort payments newest first
          allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
          this.payments.set(allPayments);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.showAlert('Failed to load billing invoices and payments', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onInvoiceFilter(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val === 'all') {
      this.selectedInvoiceId.set(null);
    } else {
      const invId = Number(val);
      this.selectedInvoiceId.set(invId);
      // Fetch fresh payments for selected invoice
      this.billingService.getPaymentsByInvoice(invId).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            // Update payments list with specific invoice payments
            const inv = this.invoices().find(i => i.id === invId);
            const enriched = res.data.map(p => ({
              ...p,
              invoiceNumber: p.invoiceNumber || inv?.invoiceNumber || `#${invId}`
            }));
            this.payments.update(curr => {
              const other = curr.filter(p => p.invoiceId !== invId);
              return [...enriched, ...other].sort(
                (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
              );
            });
          }
        }
      });
    }
  }

  openRecordModal(): void {
    this.paymentForm = this.initForm();
    this.modalSelectedInvoiceId.set(null);
    this.showModal.set(true);
  }

  openRecordModalForInvoice(inv: Invoice): void {
    this.paymentForm = this.initForm();
    this.modalSelectedInvoiceId.set(inv.id);
    this.paymentForm.patchValue({
      invoiceId: inv.id,
      amount: inv.balanceDue > 0 ? inv.balanceDue : null
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalSelectedInvoiceId.set(null);
    this.paymentForm.reset();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  onModalInvoiceChange(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    this.modalSelectedInvoiceId.set(id);
    const target = this.invoices().find(i => i.id === id);
    if (target && target.balanceDue > 0) {
      this.paymentForm.patchValue({ amount: target.balanceDue });
    }
  }

  payFullBalance(): void {
    const inv = this.modalSelectedInvoice();
    if (inv && inv.balanceDue > 0) {
      this.paymentForm.patchValue({ amount: inv.balanceDue });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.paymentForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const rawVal = this.paymentForm.getRawValue();

    const dto: RecordPaymentDto = {
      invoiceId: Number(rawVal.invoiceId),
      amount: Number(rawVal.amount),
      paymentMethod: Number(rawVal.paymentMethod) as PaymentMethod,
      transactionReference: rawVal.transactionReference ? rawVal.transactionReference.trim() : undefined,
      notes: rawVal.notes ? rawVal.notes.trim() : undefined
    };

    this.billingService.recordPayment(dto).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success && res.data) {
          const inv = this.invoices().find(i => i.id === dto.invoiceId);
          const newPayment: Payment = {
            ...res.data,
            invoiceNumber: res.data.invoiceNumber || inv?.invoiceNumber || `#${dto.invoiceId}`
          };
          this.payments.update(list => [newPayment, ...list]);
          this.showAlert(`Payment of $${dto.amount.toFixed(2)} recorded successfully`, 'success');
        } else {
          this.showAlert(res.message || 'Payment recorded successfully', 'success');
        }
        this.loadData();
        this.closeModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Error processing payment transaction', 'error');
      }
    });
  }

  getMethodClass(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.Cash:
        return 'badge-cash';
      case PaymentMethod.CreditCard:
        return 'badge-cc';
      case PaymentMethod.DebitCard:
        return 'badge-dc';
      case PaymentMethod.InsuranceClaim:
        return 'badge-insurance';
      case PaymentMethod.BankTransfer:
        return 'badge-transfer';
      default:
        return 'badge-cash';
    }
  }

  getMethodName(method: PaymentMethod, fallbackName?: string): string {
    return PaymentMethodNames[method] || fallbackName || 'Other';
  }

  showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => {
      this.dismissAlert();
    }, 4500);
  }

  dismissAlert(): void {
    this.alertMessage.set(null);
  }
}
