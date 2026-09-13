// ============================================================
// Presentation Layer — Invoices Component
// Management of medical billing invoices, line items, & statuses
// ============================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BillingServicePort } from '../../../../application/ports/billing.port';
import { ClinicalServicePort } from '../../../../application/ports/clinical.port';
import { Invoice, CreateInvoiceDto } from '../../../../domain/models/billing.models';
import { InvoiceStatus, InvoiceStatusNames } from '../../../../domain/enums/enums';
import { Patient } from '../../../../domain/models/clinical.models';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="page-container">
      <!-- Header Section -->
      <div class="page-header">
        <div>
          <h1>Patient Invoices</h1>
          <p>Generate, monitor, and manage clinical treatment bills, insurance coverage, and balances</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">
          <span class="btn-icon">+</span> Generate Invoice
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

      <!-- Main Content Card -->
      <div class="content-card">
        <div class="table-actions">
          <div class="search-and-filter">
            <div class="search-wrap">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by invoice # or patient name..."
                [value]="searchQuery()"
                (input)="onSearch($event)"
                class="search-input"
              />
            </div>
            <select [value]="statusFilter()" (change)="onStatusFilter($event)" class="filter-select">
              <option value="all">All Statuses</option>
              @for (st of statusOptions; track st.value) {
                <option [value]="st.value">{{ st.label }}</option>
              }
            </select>
          </div>
          <div class="actions-right">
            <span class="count-badge">{{ filteredInvoices().length }} Invoices</span>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-box">
            <div class="spinner"></div>
            <span>Loading billing invoices...</span>
          </div>
        } @else if (filteredInvoices().length === 0) {
          <div class="empty-box">
            <div class="empty-icon">🧾</div>
            <h3>No invoices found</h3>
            <p>{{ searchQuery() || statusFilter() !== 'all' ? 'No invoices match your filters.' : 'Get started by creating your first patient invoice.' }}</p>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="expand-col"></th>
                  <th>Invoice #</th>
                  <th>Patient</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th class="text-right">Subtotal</th>
                  <th class="text-right">Tax</th>
                  <th class="text-right">Discount</th>
                  <th class="text-right">Insurance</th>
                  <th class="text-right">Total</th>
                  <th class="text-right">Paid</th>
                  <th class="text-right">Balance Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (inv of filteredInvoices(); track inv.id) {
                  <tr class="main-row" [class.expanded-highlight]="expandedInvoiceId() === inv.id">
                    <td class="expand-col">
                      <button
                        (click)="toggleExpand(inv.id)"
                        class="btn-expand"
                        [title]="expandedInvoiceId() === inv.id ? 'Collapse items' : 'Expand line items'"
                      >
                        {{ expandedInvoiceId() === inv.id ? '▼' : '▶' }}
                      </button>
                    </td>
                    <td class="font-mono font-semibold text-primary">
                      {{ inv.invoiceNumber }}
                    </td>
                    <td>
                      <div class="patient-cell">
                        <span class="patient-avatar">👤</span>
                        <div>
                          <span class="patient-name">{{ inv.patientName || getPatientName(inv.patientId) }}</span>
                          <span class="sub-id">ID: #{{ inv.patientId }}</span>
                        </div>
                      </div>
                    </td>
                    <td>{{ inv.issueDate | date:'mediumDate' }}</td>
                    <td>
                      <span [class.text-danger]="isPastDue(inv)">
                        {{ inv.dueDate | date:'mediumDate' }}
                      </span>
                    </td>
                    <td class="text-right font-mono">{{ inv.subTotal | currency }}</td>
                    <td class="text-right font-mono text-muted">{{ inv.taxAmount | currency }}</td>
                    <td class="text-right font-mono text-muted">
                      {{ inv.discountAmount > 0 ? ('-' + (inv.discountAmount | currency)) : '$0.00' }}
                    </td>
                    <td class="text-right font-mono text-info">
                      {{ inv.insuranceCoverageAmount > 0 ? ('-' + (inv.insuranceCoverageAmount | currency)) : '$0.00' }}
                    </td>
                    <td class="text-right font-mono font-bold">{{ inv.totalAmount | currency }}</td>
                    <td class="text-right font-mono text-success">{{ inv.paidAmount | currency }}</td>
                    <td class="text-right font-mono font-bold" [class.text-danger]="inv.balanceDue > 0" [class.text-success]="inv.balanceDue === 0">
                      {{ inv.balanceDue | currency }}
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="getStatusClass(inv.status)">
                        {{ getStatusName(inv.status, inv.statusName) }}
                      </span>
                    </td>
                  </tr>

                  <!-- Expandable Line Items & Payment Breakdown -->
                  @if (expandedInvoiceId() === inv.id) {
                    <tr class="details-row">
                      <td colspan="13">
                        <div class="details-card">
                          <div class="details-section">
                            <div class="section-title-wrap">
                              <h4>Line Items ({{ inv.items?.length || 0 }})</h4>
                            </div>

                            @if (!inv.items || inv.items.length === 0) {
                              <p class="text-muted italic">No items listed on this invoice.</p>
                            } @else {
                              <table class="nested-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Description</th>
                                    <th class="text-center">Quantity</th>
                                    <th class="text-right">Unit Price</th>
                                    <th class="text-right">Total Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  @for (item of inv.items; track item.id; let idx = $index) {
                                    <tr>
                                      <td class="font-mono text-muted">{{ idx + 1 }}</td>
                                      <td class="font-medium">{{ item.description }}</td>
                                      <td class="text-center font-mono">{{ item.quantity }}</td>
                                      <td class="text-right font-mono">{{ item.unitPrice | currency }}</td>
                                      <td class="text-right font-mono font-semibold">{{ item.totalPrice | currency }}</td>
                                    </tr>
                                  }
                                </tbody>
                              </table>
                            }
                          </div>

                          @if (inv.payments && inv.payments.length > 0) {
                            <div class="details-section mt-4">
                              <div class="section-title-wrap">
                                <h4>Recorded Payments ({{ inv.payments.length }})</h4>
                              </div>
                              <table class="nested-table payments-table">
                                <thead>
                                  <tr>
                                    <th>Payment Date</th>
                                    <th>Method</th>
                                    <th>Reference</th>
                                    <th>Notes</th>
                                    <th class="text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  @for (p of inv.payments; track p.id) {
                                    <tr>
                                      <td>{{ p.paymentDate | date:'medium' }}</td>
                                      <td>
                                        <span class="method-tag">{{ p.paymentMethodName || 'Payment' }}</span>
                                      </td>
                                      <td class="font-mono text-muted">{{ p.transactionReference || '—' }}</td>
                                      <td class="text-muted">{{ p.notes || '—' }}</td>
                                      <td class="text-right font-mono text-success font-bold">{{ p.amount | currency }}</td>
                                    </tr>
                                  }
                                </tbody>
                              </table>
                            </div>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Create Invoice Modal -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="onBackdropClick($event)">
          <div class="modal-card modal-lg">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="modal-icon">🧾</span>
                <div>
                  <h3>Create Patient Invoice</h3>
                  <p class="modal-subtitle">Generate a billing invoice with itemized charges and apply insurance benefits</p>
                </div>
              </div>
              <button (click)="closeModal()" class="btn-close" aria-label="Close modal">&times;</button>
            </div>

            <form [formGroup]="invoiceForm" (ngSubmit)="onSubmit()" class="modal-form">
              <!-- Top Form Row: Patient & Insurance Options -->
              <div class="form-row">
                <div class="form-group flex-2">
                  <label for="patientId">Patient <span class="required">*</span></label>
                  <select id="patientId" formControlName="patientId" [class.input-error]="isFieldInvalid('patientId')">
                    <option [ngValue]="null" disabled>Select patient...</option>
                    @for (p of patients(); track p.id) {
                      <option [ngValue]="p.id">{{ p.firstName }} {{ p.lastName }} (ID: #{{ p.id }})</option>
                    }
                  </select>
                  @if (isFieldInvalid('patientId')) {
                    <span class="field-error">Please select a patient.</span>
                  }
                </div>

                <div class="form-group flex-1 checkbox-group-invoice">
                  <label class="toggle-label" for="applyInsurance">
                    <input id="applyInsurance" type="checkbox" formControlName="applyInsurance" />
                    <span class="toggle-text">Apply Insurance</span>
                  </label>
                  <span class="toggle-hint">Deduct coverage from patient's active policy</span>
                </div>
              </div>

              <!-- Rates Row: Tax and Discount -->
              <div class="form-row">
                <div class="form-group">
                  <label for="taxPercentage">Tax Percentage (%) <span class="required">*</span></label>
                  <input
                    id="taxPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    formControlName="taxPercentage"
                    [class.input-error]="isFieldInvalid('taxPercentage')"
                  />
                  @if (isFieldInvalid('taxPercentage')) {
                    <span class="field-error">Tax % must be between 0 and 100.</span>
                  }
                </div>

                <div class="form-group">
                  <label for="discountAmount">Discount Amount ($) <span class="required">*</span></label>
                  <input
                    id="discountAmount"
                    type="number"
                    min="0"
                    step="1"
                    formControlName="discountAmount"
                    [class.input-error]="isFieldInvalid('discountAmount')"
                  />
                  @if (isFieldInvalid('discountAmount')) {
                    <span class="field-error">Discount cannot be negative.</span>
                  }
                </div>
              </div>

              <!-- Line Items Dynamic Section -->
              <div class="items-section">
                <div class="items-header">
                  <div>
                    <h4>Invoice Line Items ({{ itemsArray.length }})</h4>
                    <p class="items-sub">Add treatments, diagnostic services, medications, or consultations</p>
                  </div>
                  <button type="button" (click)="addItem()" class="btn-add-item">
                    + Add Line Item
                  </button>
                </div>

                @if (itemsArray.length === 0) {
                  <div class="no-items-warning">
                    ⚠️ At least one line item is required to generate an invoice.
                  </div>
                }

                <div class="items-list">
                  @for (itemGroup of itemsArray.controls; track $index; let idx = $index) {
                    <div [formGroup]="$any(itemGroup)" class="line-item-row">
                      <div class="item-desc-col">
                        <label class="mini-label">Description *</label>
                        <input
                          type="text"
                          formControlName="description"
                          placeholder="e.g. Comprehensive Physical Exam, Blood Chemistry"
                        />
                      </div>

                      <div class="item-qty-col">
                        <label class="mini-label">Qty *</label>
                        <input
                          type="number"
                          min="1"
                          formControlName="quantity"
                        />
                      </div>

                      <div class="item-price-col">
                        <label class="mini-label">Unit Price ($) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          formControlName="unitPrice"
                        />
                      </div>

                      <div class="item-total-col">
                        <label class="mini-label">Subtotal</label>
                        <span class="item-subtotal-display font-mono">
                          {{ getItemSubtotal(itemGroup) | currency }}
                        </span>
                      </div>

                      <div class="item-action-col">
                        <button
                          type="button"
                          (click)="removeItem(idx)"
                          class="btn-delete-item"
                          [disabled]="itemsArray.length <= 1"
                          title="Remove item"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Real-time Cost Breakdown Summary Box -->
              <div class="calculation-summary">
                <div class="summary-line">
                  <span>Items Subtotal:</span>
                  <span class="font-mono">{{ calculatedSubtotal() | currency }}</span>
                </div>
                <div class="summary-line">
                  <span>Estimated Tax ({{ invoiceForm.get('taxPercentage')?.value || 0 }}%):</span>
                  <span class="font-mono">+{{ calculatedTax() | currency }}</span>
                </div>
                @if ((invoiceForm.get('discountAmount')?.value || 0) > 0) {
                  <div class="summary-line text-warning">
                    <span>Discount:</span>
                    <span class="font-mono">-{{ (invoiceForm.get('discountAmount')?.value || 0) | currency }}</span>
                  </div>
                }
                @if (invoiceForm.get('applyInsurance')?.value) {
                  <div class="summary-line text-info">
                    <span>Insurance:</span>
                    <span class="font-mono">Applied upon generation</span>
                  </div>
                }
                <div class="summary-line total-line">
                  <span>Estimated Invoice Total:</span>
                  <span class="font-mono text-primary font-bold">{{ calculatedTotal() | currency }}</span>
                </div>
              </div>

              <!-- Modal Actions Footer -->
              <div class="modal-actions">
                <button type="button" (click)="closeModal()" class="btn-secondary" [disabled]="isSubmitting()">
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="invoiceForm.invalid || itemsArray.length === 0 || isSubmitting()"
                  class="btn-primary"
                >
                  {{ isSubmitting() ? 'Generating...' : 'Create Invoice' }}
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
    .btn-expand {
      background: #0f172a;
      border: 1px solid #334155;
      color: #94a3b8;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.75rem;
      transition: all 0.15s;
    }
    .btn-expand:hover {
      background: #334155;
      color: #f1f5f9;
      border-color: #3b82f6;
    }
    .btn-add-item {
      background: #0f172a;
      color: #60a5fa;
      border: 1px dashed #3b82f6;
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-add-item:hover {
      background: rgba(59, 130, 246, 0.15);
    }
    .btn-delete-item {
      background: transparent;
      border: 1px solid #334155;
      color: #f87171;
      border-radius: 6px;
      width: 34px;
      height: 34px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      transition: all 0.15s;
    }
    .btn-delete-item:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.15);
      border-color: #ef4444;
    }
    .btn-delete-item:disabled {
      opacity: 0.3;
      cursor: not-allowed;
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
    .search-and-filter {
      display: flex;
      align-items: center;
      gap: 0.75rem;
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
    .filter-select {
      padding: 0.55rem 1rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 0.875rem;
      cursor: pointer;
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
    .expand-col {
      width: 40px;
      text-align: center;
      padding-left: 1rem !important;
      padding-right: 0 !important;
    }
    .data-table th {
      background: #0f172a;
      padding: 0.85rem 1rem;
      color: #94a3b8;
      font-weight: 600;
      border-bottom: 1px solid #334155;
      text-transform: uppercase;
      font-size: 0.725rem;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }
    .data-table td {
      padding: 0.95rem 1rem;
      border-bottom: 1px solid #334155;
      color: #f1f5f9;
      vertical-align: middle;
      white-space: nowrap;
    }
    .main-row {
      transition: background 0.15s ease;
    }
    .main-row:hover {
      background: #334155 !important;
    }
    .expanded-highlight {
      background: rgba(59, 130, 246, 0.08) !important;
    }

    /* Table specifics */
    .patient-cell {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .patient-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #0f172a;
      border: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
    }
    .patient-name {
      font-weight: 600;
      color: #f1f5f9;
      display: block;
    }
    .sub-id {
      font-size: 0.725rem;
      color: #64748b;
      font-family: monospace;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #60a5fa !important; }
    .text-success { color: #34d399 !important; }
    .text-danger { color: #f87171 !important; }
    .text-warning { color: #fbbf24 !important; }
    .text-info { color: #38bdf8 !important; }
    .text-muted { color: #94a3b8; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* Badges */
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.725rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }
    .badge-paid {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-partial {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .badge-pending {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-cancelled {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .badge-draft {
      background: rgba(148, 163, 184, 0.15);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    /* Details row & nested table */
    .details-row td {
      padding: 0;
      background: #0f172a !important;
      border-bottom: 2px solid #3b82f6;
    }
    .details-card {
      padding: 1.5rem 2rem;
    }
    .details-section h4 {
      margin: 0 0 0.85rem 0;
      font-size: 0.95rem;
      color: #cbd5e1;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .nested-table {
      width: 100%;
      border-collapse: collapse;
      background: #1e293b;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    .nested-table th {
      background: #1e293b;
      padding: 0.65rem 1rem;
      color: #94a3b8;
      font-size: 0.75rem;
      border-bottom: 1px solid #334155;
      text-transform: uppercase;
    }
    .nested-table td {
      padding: 0.65rem 1rem;
      border-bottom: 1px solid #283548;
      color: #f1f5f9;
      font-size: 0.85rem;
      background: #1e293b !important;
    }
    .nested-table tr:last-child td {
      border-bottom: none;
    }
    .method-tag {
      background: #0f172a;
      border: 1px solid #334155;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #38bdf8;
    }
    .mt-4 { margin-top: 1.25rem; }
    .italic { font-style: italic; }

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

    /* Modal */
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
      width: 600px;
      max-width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .modal-lg {
      width: 780px;
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

    /* Form inside Modal */
    .modal-form {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    @media (max-width: 640px) {
      .form-row { flex-direction: column; }
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
    .form-group input, .form-group select {
      padding: 0.65rem 0.85rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .form-group input:focus, .form-group select:focus {
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
    .checkbox-group-invoice {
      justify-content: center;
      padding-top: 1.2rem;
    }
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      cursor: pointer;
      user-select: none;
    }
    .toggle-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #3b82f6;
      cursor: pointer;
    }
    .toggle-text {
      font-size: 0.875rem;
      font-weight: 600;
      color: #f1f5f9;
    }
    .toggle-hint {
      font-size: 0.75rem;
      color: #64748b;
    }

    /* Items Section */
    .items-section {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1.25rem;
    }
    .items-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .items-header h4 {
      margin: 0;
      font-size: 0.925rem;
      color: #f1f5f9;
      font-weight: 600;
    }
    .items-sub {
      margin: 0.2rem 0 0 0;
      font-size: 0.75rem;
      color: #64748b;
    }
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .line-item-row {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      background: #1e293b;
      padding: 0.75rem;
      border-radius: 8px;
      border: 1px solid #334155;
    }
    @media (max-width: 640px) {
      .line-item-row { flex-wrap: wrap; }
    }
    .mini-label {
      font-size: 0.7rem;
      color: #94a3b8;
      text-transform: uppercase;
      margin-bottom: 0.25rem;
      display: block;
      font-weight: 600;
    }
    .item-desc-col { flex: 3; }
    .item-qty-col { flex: 1; min-width: 70px; }
    .item-price-col { flex: 1.5; min-width: 90px; }
    .item-total-col {
      flex: 1.5;
      min-width: 90px;
      text-align: right;
    }
    .item-subtotal-display {
      display: block;
      padding: 0.6rem 0;
      font-weight: 600;
      color: #f1f5f9;
    }
    .item-action-col {
      display: flex;
      align-items: center;
      padding-bottom: 0.1rem;
    }
    .line-item-row input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.55rem 0.75rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #f1f5f9;
      font-size: 0.85rem;
    }
    .line-item-row input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    .no-items-warning {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.825rem;
    }

    /* Calculation Summary */
    .calculation-summary {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .total-line {
      border-top: 1px solid #334155;
      padding-top: 0.5rem;
      font-size: 1rem;
      color: #f1f5f9;
      font-weight: 600;
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
export class InvoicesComponent implements OnInit {
  private billingService = inject(BillingServicePort);
  private clinicalService = inject(ClinicalServicePort);
  private fb = inject(FormBuilder);

  // Reactive state signals
  invoices = signal<Invoice[]>([]);
  patients = signal<Patient[]>([]);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');
  expandedInvoiceId = signal<number | null>(null);
  showModal = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  statusOptions = [
    { value: InvoiceStatus.Draft.toString(), label: InvoiceStatusNames[InvoiceStatus.Draft] },
    { value: InvoiceStatus.Pending.toString(), label: InvoiceStatusNames[InvoiceStatus.Pending] },
    { value: InvoiceStatus.PartiallyPaid.toString(), label: InvoiceStatusNames[InvoiceStatus.PartiallyPaid] },
    { value: InvoiceStatus.Paid.toString(), label: InvoiceStatusNames[InvoiceStatus.Paid] },
    { value: InvoiceStatus.Cancelled.toString(), label: InvoiceStatusNames[InvoiceStatus.Cancelled] }
  ];

  // Computed filtered list
  filteredInvoices = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const list = this.invoices();

    return list.filter(inv => {
      const matchesSearch = !query ||
        inv.invoiceNumber.toLowerCase().includes(query) ||
        (inv.patientName || this.getPatientName(inv.patientId)).toLowerCase().includes(query);

      const matchesStatus = status === 'all' || inv.status.toString() === status;

      return matchesSearch && matchesStatus;
    });
  });

  // Reactive form
  invoiceForm: FormGroup = this.initForm();

  get itemsArray(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): FormGroup {
    return this.fb.group({
      patientId: [null, [Validators.required]],
      taxPercentage: [5, [Validators.required, Validators.min(0), Validators.max(100)]],
      discountAmount: [0, [Validators.required, Validators.min(0)]],
      applyInsurance: [false],
      items: this.fb.array([this.createItemFormGroup()])
    });
  }

  private createItemFormGroup(): FormGroup {
    return this.fb.group({
      description: ['', [Validators.required, Validators.maxLength(200)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      invoicesRes: this.billingService.getInvoices(),
      patientsRes: this.clinicalService.getPatients()
    }).subscribe({
      next: ({ invoicesRes, patientsRes }) => {
        if (invoicesRes.success && invoicesRes.data) {
          this.invoices.set(invoicesRes.data);
        } else if (invoicesRes.data) {
          this.invoices.set(invoicesRes.data);
        }
        if (patientsRes.success && patientsRes.data) {
          this.patients.set(patientsRes.data);
        } else if (patientsRes.data) {
          this.patients.set(patientsRes.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.showAlert('Failed to load invoices and patient data', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onStatusFilter(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.statusFilter.set(val);
  }

  toggleExpand(id: number): void {
    this.expandedInvoiceId.update(curr => curr === id ? null : id);
  }

  openCreateModal(): void {
    this.invoiceForm = this.initForm();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.invoiceForm.reset();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  addItem(): void {
    this.itemsArray.push(this.createItemFormGroup());
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  getItemSubtotal(itemGroup: any): number {
    const qty = Number(itemGroup.get('quantity')?.value || 0);
    const price = Number(itemGroup.get('unitPrice')?.value || 0);
    return qty * price;
  }

  calculatedSubtotal(): number {
    return this.itemsArray.controls.reduce((sum, ctrl) => {
      const qty = Number(ctrl.get('quantity')?.value || 0);
      const price = Number(ctrl.get('unitPrice')?.value || 0);
      return sum + (qty * price);
    }, 0);
  }

  calculatedTax(): number {
    const sub = this.calculatedSubtotal();
    const taxRate = Number(this.invoiceForm.get('taxPercentage')?.value || 0);
    return sub * (taxRate / 100);
  }

  calculatedTotal(): number {
    const sub = this.calculatedSubtotal();
    const tax = this.calculatedTax();
    const discount = Number(this.invoiceForm.get('discountAmount')?.value || 0);
    const total = sub + tax - discount;
    return total > 0 ? total : 0;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.invoiceForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.invoiceForm.invalid || this.itemsArray.length === 0) {
      this.invoiceForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const rawVal = this.invoiceForm.getRawValue();

    const createDto: CreateInvoiceDto = {
      patientId: Number(rawVal.patientId),
      taxPercentage: Number(rawVal.taxPercentage || 0),
      discountAmount: Number(rawVal.discountAmount || 0),
      applyInsurance: Boolean(rawVal.applyInsurance),
      items: rawVal.items.map((it: any) => ({
        description: (it.description || '').trim(),
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice)
      }))
    };

    this.billingService.createInvoice(createDto).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        const newInvoice = res.data;
        if (res.success && newInvoice) {
          this.invoices.update(list => [newInvoice, ...list]);
          this.showAlert(`Invoice ${newInvoice.invoiceNumber} created successfully`, 'success');
        } else {
          this.showAlert(res.message || 'Invoice generated successfully', 'success');
          this.loadData();
        }
        this.closeModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Error generating invoice', 'error');
      }
    });
  }

  getStatusClass(status: InvoiceStatus): string {
    switch (status) {
      case InvoiceStatus.Paid:
        return 'badge-paid';
      case InvoiceStatus.PartiallyPaid:
        return 'badge-partial';
      case InvoiceStatus.Pending:
        return 'badge-pending';
      case InvoiceStatus.Cancelled:
        return 'badge-cancelled';
      case InvoiceStatus.Draft:
      default:
        return 'badge-draft';
    }
  }

  getStatusName(status: InvoiceStatus, fallbackName?: string): string {
    return InvoiceStatusNames[status] || fallbackName || 'Unknown';
  }

  getPatientName(patientId: number): string {
    const pt = this.patients().find(p => p.id === patientId);
    return pt ? `${pt.firstName} ${pt.lastName}` : `Patient #${patientId}`;
  }

  isPastDue(inv: Invoice): boolean {
    if (inv.status === InvoiceStatus.Paid || inv.balanceDue <= 0 || !inv.dueDate) return false;
    return new Date(inv.dueDate).getTime() < new Date().getTime();
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
