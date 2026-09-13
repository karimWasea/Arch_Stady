// ============================================================
// Presentation Layer — Insurance Policies Component
// Management of patient health insurance policies & coverages
// ============================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BillingServicePort } from '../../../../application/ports/billing.port';
import { ClinicalServicePort } from '../../../../application/ports/clinical.port';
import { Insurance, CreateInsuranceDto, UpdateInsuranceDto } from '../../../../domain/models/billing.models';
import { Patient } from '../../../../domain/models/clinical.models';

@Component({
  selector: 'app-insurance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="page-container">
      <!-- Header Section -->
      <div class="page-header">
        <div>
          <h1>Insurance Policies</h1>
          <p>Manage patient insurance coverage, policy providers, and claim thresholds</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">
          <span class="btn-icon">+</span> New Insurance Policy
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
          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by patient, provider, or policy #..."
              [value]="searchQuery()"
              (input)="onSearch($event)"
              class="search-input"
            />
          </div>
          <div class="actions-right">
            <span class="count-badge">{{ filteredInsurances().length }} Policies</span>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-box">
            <div class="spinner"></div>
            <span>Loading insurance policies...</span>
          </div>
        } @else if (filteredInsurances().length === 0) {
          <div class="empty-box">
            <div class="empty-icon">🛡️</div>
            <h3>No insurance policies found</h3>
            <p>{{ searchQuery() ? 'No policies match your search query.' : 'Get started by creating the first insurance policy.' }}</p>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Policy ID</th>
                  <th>Patient</th>
                  <th>Insurance Provider</th>
                  <th>Policy Number</th>
                  <th>Coverage</th>
                  <th>Max Amount</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredInsurances(); track item.id) {
                  <tr>
                    <td class="font-mono">#{{ item.id }}</td>
                    <td>
                      <div class="patient-cell">
                        <span class="patient-avatar">👤</span>
                        <div>
                          <span class="patient-name">{{ item.patientName || getPatientName(item.patientId) }}</span>
                          <span class="sub-id">ID: #{{ item.patientId }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="provider-cell">
                      <span class="provider-badge">{{ item.providerName }}</span>
                    </td>
                    <td class="font-mono font-medium">{{ item.policyNumber }}</td>
                    <td>
                      <div class="coverage-bar-cell">
                        <span class="coverage-text">{{ item.coveragePercentage }}%</span>
                        <div class="progress-track">
                          <div class="progress-fill" [style.width.%]="item.coveragePercentage"></div>
                        </div>
                      </div>
                    </td>
                    <td class="amount-cell">{{ item.maxCoverageAmount | currency }}</td>
                    <td>
                      <span [class.text-danger]="isExpired(item.expiryDate)">
                        {{ item.expiryDate | date:'mediumDate' }}
                      </span>
                    </td>
                    <td>
                      @if (item.isActive && !isExpired(item.expiryDate)) {
                        <span class="status-badge badge-active">Active</span>
                      } @else if (isExpired(item.expiryDate)) {
                        <span class="status-badge badge-expired">Expired</span>
                      } @else {
                        <span class="status-badge badge-inactive">Inactive</span>
                      }
                    </td>
                    <td class="text-right">
                      <button (click)="openEditModal(item)" class="btn-action edit" title="Edit Policy">
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Create / Edit Insurance Modal -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="onBackdropClick($event)">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="modal-icon">{{ isEditing() ? '✏️' : '🛡️' }}</span>
                <div>
                  <h3>{{ isEditing() ? 'Edit Insurance Policy' : 'Create Insurance Policy' }}</h3>
                  <p class="modal-subtitle">{{ isEditing() ? 'Update policy coverage details and active status' : 'Register a new patient health insurance policy' }}</p>
                </div>
              </div>
              <button (click)="closeModal()" class="btn-close" aria-label="Close modal">&times;</button>
            </div>

            <form [formGroup]="insuranceForm" (ngSubmit)="onSubmit()" class="modal-form">
              <!-- Patient Selection -->
              <div class="form-group">
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

              <!-- Provider & Policy Number Row -->
              <div class="form-row">
                <div class="form-group">
                  <label for="providerName">Provider Name <span class="required">*</span></label>
                  <input
                    id="providerName"
                    type="text"
                    formControlName="providerName"
                    placeholder="e.g. Blue Cross, Aetna, Cigna"
                    [class.input-error]="isFieldInvalid('providerName')"
                  />
                  @if (isFieldInvalid('providerName')) {
                    <span class="field-error">Provider name is required.</span>
                  }
                </div>

                <div class="form-group">
                  <label for="policyNumber">Policy Number <span class="required">*</span></label>
                  <input
                    id="policyNumber"
                    type="text"
                    formControlName="policyNumber"
                    placeholder="e.g. POL-9847120"
                    [class.input-error]="isFieldInvalid('policyNumber')"
                  />
                  @if (isFieldInvalid('policyNumber')) {
                    <span class="field-error">Policy number is required.</span>
                  }
                </div>
              </div>

              <!-- Coverage Percentage & Max Amount Row -->
              <div class="form-row">
                <div class="form-group">
                  <label for="coveragePercentage">Coverage Percentage (%) <span class="required">*</span></label>
                  <input
                    id="coveragePercentage"
                    type="number"
                    min="1"
                    max="100"
                    formControlName="coveragePercentage"
                    placeholder="e.g. 80"
                    [class.input-error]="isFieldInvalid('coveragePercentage')"
                  />
                  @if (isFieldInvalid('coveragePercentage')) {
                    <span class="field-error">Coverage must be between 1% and 100%.</span>
                  }
                </div>

                <div class="form-group">
                  <label for="maxCoverageAmount">Max Coverage Amount ($) <span class="required">*</span></label>
                  <input
                    id="maxCoverageAmount"
                    type="number"
                    min="0"
                    step="100"
                    formControlName="maxCoverageAmount"
                    placeholder="e.g. 50000"
                    [class.input-error]="isFieldInvalid('maxCoverageAmount')"
                  />
                  @if (isFieldInvalid('maxCoverageAmount')) {
                    <span class="field-error">Valid maximum amount is required.</span>
                  }
                </div>
              </div>

              <!-- Expiry Date & Active Status -->
              <div class="form-row">
                <div class="form-group">
                  <label for="expiryDate">Policy Expiry Date <span class="required">*</span></label>
                  <input
                    id="expiryDate"
                    type="date"
                    formControlName="expiryDate"
                    [class.input-error]="isFieldInvalid('expiryDate')"
                  />
                  @if (isFieldInvalid('expiryDate')) {
                    <span class="field-error">Expiration date is required.</span>
                  }
                </div>

                @if (isEditing()) {
                  <div class="form-group checkbox-group">
                    <label class="toggle-label" for="isActive">
                      <input id="isActive" type="checkbox" formControlName="isActive" />
                      <span class="toggle-text">Active Policy</span>
                    </label>
                    <span class="toggle-hint">Toggle whether this policy is currently valid for claims</span>
                  </div>
                }
              </div>

              <!-- Modal Actions Footer -->
              <div class="modal-actions">
                <button type="button" (click)="closeModal()" class="btn-secondary" [disabled]="isSubmitting()">
                  Cancel
                </button>
                <button type="submit" [disabled]="insuranceForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Saving...' : (isEditing() ? 'Update Policy' : 'Save Policy') }}
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
      max-width: 1300px;
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
    .btn-action {
      background: transparent;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .btn-action:hover {
      background: #334155;
      color: #f1f5f9;
      border-color: #64748b;
    }
    .btn-action.edit:hover {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border-color: #3b82f6;
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

    /* Table Actions Bar */
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
    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 360px;
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
    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
    .search-input::placeholder { color: #64748b; }
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

    /* Table Cells */
    .patient-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .patient-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0f172a;
      border: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
    }
    .patient-name {
      font-weight: 600;
      color: #f1f5f9;
      display: block;
    }
    .sub-id {
      font-size: 0.75rem;
      color: #64748b;
      font-family: monospace;
    }
    .provider-badge {
      background: rgba(59, 130, 246, 0.1);
      color: #60a5fa;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #94a3b8;
    }
    .font-medium {
      font-weight: 500;
      color: #cbd5e1;
    }
    .amount-cell {
      font-weight: 600;
      color: #10b981;
      font-family: ui-monospace, monospace;
    }
    .coverage-bar-cell {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .coverage-text {
      font-weight: 600;
      min-width: 38px;
    }
    .progress-track {
      width: 60px;
      height: 6px;
      background: #0f172a;
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    .progress-fill {
      height: 100%;
      background: #3b82f6;
      border-radius: 999px;
    }
    .text-right { text-align: right; }
    .text-danger { color: #f87171 !important; font-weight: 500; }

    /* Badges */
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-active {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-inactive {
      background: rgba(148, 163, 184, 0.15);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }
    .badge-expired {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
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
      width: 600px;
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
    .form-group select option {
      background: #0f172a;
      color: #f1f5f9;
    }
    .input-error {
      border-color: #ef4444 !important;
    }
    .field-error {
      color: #f87171;
      font-size: 0.75rem;
      margin-top: 0.15rem;
    }
    .checkbox-group {
      justify-content: center;
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
      text-transform: none;
    }
    .toggle-hint {
      font-size: 0.75rem;
      color: #64748b;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 1.25rem;
      border-top: 1px solid #334155;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class InsuranceComponent implements OnInit {
  private billingService = inject(BillingServicePort);
  private clinicalService = inject(ClinicalServicePort);
  private fb = inject(FormBuilder);

  // Reactive state signals
  insurances = signal<Insurance[]>([]);
  patients = signal<Patient[]>([]);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId = signal<number | null>(null);
  isSubmitting = signal<boolean>(false);
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Computed filtered list
  filteredInsurances = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.insurances();
    if (!query) return list;

    return list.filter(item => {
      const patient = (item.patientName || this.getPatientName(item.patientId)).toLowerCase();
      const provider = (item.providerName || '').toLowerCase();
      const policy = (item.policyNumber || '').toLowerCase();
      return patient.includes(query) || provider.includes(query) || policy.includes(query);
    });
  });

  // Reactive form
  insuranceForm: FormGroup = this.initForm();

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): FormGroup {
    return this.fb.group({
      patientId: [null, [Validators.required]],
      providerName: ['', [Validators.required, Validators.maxLength(150)]],
      policyNumber: ['', [Validators.required, Validators.maxLength(50)]],
      coveragePercentage: [80, [Validators.required, Validators.min(1), Validators.max(100)]],
      maxCoverageAmount: [10000, [Validators.required, Validators.min(0)]],
      expiryDate: ['', [Validators.required]],
      isActive: [true]
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      insurancesRes: this.billingService.getInsurances(),
      patientsRes: this.clinicalService.getPatients()
    }).subscribe({
      next: ({ insurancesRes, patientsRes }) => {
        if (insurancesRes.success && insurancesRes.data) {
          this.insurances.set(insurancesRes.data);
        } else if (insurancesRes.data) {
          this.insurances.set(insurancesRes.data);
        }
        if (patientsRes.success && patientsRes.data) {
          this.patients.set(patientsRes.data);
        } else if (patientsRes.data) {
          this.patients.set(patientsRes.data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.showAlert('Failed to load insurance policies and patients', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.insuranceForm = this.initForm();
    this.insuranceForm.get('patientId')?.enable();
    this.showModal.set(true);
  }

  openEditModal(item: Insurance): void {
    this.isEditing.set(true);
    this.editingId.set(item.id);

    const formattedExpiry = item.expiryDate ? item.expiryDate.split('T')[0] : '';
    this.insuranceForm.reset({
      patientId: item.patientId,
      providerName: item.providerName,
      policyNumber: item.policyNumber,
      coveragePercentage: item.coveragePercentage,
      maxCoverageAmount: item.maxCoverageAmount,
      expiryDate: formattedExpiry,
      isActive: item.isActive
    });
    // In edit mode, patient is fixed
    this.insuranceForm.get('patientId')?.disable();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.isEditing.set(false);
    this.editingId.set(null);
    this.insuranceForm.reset();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.insuranceForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.insuranceForm.invalid) {
      this.insuranceForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const rawVal = this.insuranceForm.getRawValue();

    if (this.isEditing() && this.editingId()) {
      const updateDto: UpdateInsuranceDto = {
        patientId: Number(rawVal.patientId),
        providerName: rawVal.providerName.trim(),
        policyNumber: rawVal.policyNumber.trim(),
        coveragePercentage: Number(rawVal.coveragePercentage),
        maxCoverageAmount: Number(rawVal.maxCoverageAmount),
        expiryDate: new Date(rawVal.expiryDate).toISOString(),
        isActive: !!rawVal.isActive
      };

      this.billingService.updateInsurance(this.editingId()!, updateDto).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const updatedItem = res.data;
          if (res.success && updatedItem) {
            this.insurances.update(list => list.map(i => i.id === updatedItem.id ? updatedItem : i));
            this.showAlert('Insurance policy updated successfully', 'success');
          } else {
            this.showAlert(res.message || 'Updated policy successfully', 'success');
            this.loadData();
          }
          this.closeModal();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Error updating insurance policy', 'error');
        }
      });
    } else {
      const createDto: CreateInsuranceDto = {
        patientId: Number(rawVal.patientId),
        providerName: rawVal.providerName.trim(),
        policyNumber: rawVal.policyNumber.trim(),
        coveragePercentage: Number(rawVal.coveragePercentage),
        maxCoverageAmount: Number(rawVal.maxCoverageAmount),
        expiryDate: new Date(rawVal.expiryDate).toISOString()
      };

      this.billingService.createInsurance(createDto).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const newItem = res.data;
          if (res.success && newItem) {
            this.insurances.update(list => [newItem, ...list]);
            this.showAlert('Insurance policy created successfully', 'success');
          } else {
            this.showAlert(res.message || 'Created policy successfully', 'success');
            this.loadData();
          }
          this.closeModal();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Error creating insurance policy', 'error');
        }
      });
    }
  }

  getPatientName(patientId: number): string {
    const pt = this.patients().find(p => p.id === patientId);
    return pt ? `${pt.firstName} ${pt.lastName}` : `Patient #${patientId}`;
  }

  isExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate).getTime() < new Date().getTime();
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
