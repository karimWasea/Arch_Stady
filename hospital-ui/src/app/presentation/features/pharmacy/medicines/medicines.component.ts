// ============================================================
// Presentation Layer — Medicines Component
// Formulary registry, active ingredients, SKU tracking, and pricing
// ============================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PharmacyServicePort } from '../../../../application/ports/pharmacy.port';
import { Medicine, CreateMedicineDto, UpdateMedicineDto } from '../../../../domain/models/pharmacy.models';
import { DosageForm, DosageFormNames } from '../../../../domain/enums/enums';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>Medicine Formulary & Catalog</h1>
          <p>Register, categorize, and monitor pharmaceutical inventory items and pricing</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">
          <span class="btn-icon">➕</span> Add Medicine
        </button>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">💊</span>
          <div class="stat-info">
            <span class="stat-label">Total Medicines</span>
            <span class="stat-value">{{ medicines().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon text-success">📦</span>
          <div class="stat-info">
            <span class="stat-label">In Stock</span>
            <span class="stat-value text-success">{{ inStockCount() }}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon text-warning">⚠️</span>
          <div class="stat-info">
            <span class="stat-label">Low / Out of Stock</span>
            <span class="stat-value text-warning">{{ lowStockCount() }}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon text-info">🏷️</span>
          <div class="stat-info">
            <span class="stat-label">Dosage Forms</span>
            <span class="stat-value text-info">{{ dosageFormsCount() }}</span>
          </div>
        </div>
      </div>

      <!-- Alert Notification -->
      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType()">
          <span class="alert-icon">{{ alertType() === 'success' ? '✅' : '❌' }}</span>
          <span>{{ alertMessage() }}</span>
        </div>
      }

      <!-- Main Content Card -->
      <div class="content-card">
        <div class="table-actions">
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, generic molecule, SKU, manufacturer..."
              (input)="onSearch($event)"
              [value]="searchQuery()"
              class="search-input"
            />
            @if (searchQuery()) {
              <button (click)="clearSearch()" class="btn-clear" title="Clear search">✕</button>
            }
          </div>
          <span class="count-badge">{{ filteredMedicines().length }} Records</span>
        </div>

        @if (isLoading()) {
          <div class="state-box">
            <div class="spinner"></div>
            <p>Loading pharmacy inventory...</p>
          </div>
        } @else if (filteredMedicines().length === 0) {
          <div class="state-box">
            <span class="empty-icon">💊</span>
            <p class="empty-title">No medicines found</p>
            <p class="empty-subtitle">
              @if (searchQuery()) {
                No results match your search term "{{ searchQuery() }}"
              } @else {
                Start by adding medicines to your pharmacy catalog
              }
            </p>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Medicine Name</th>
                  <th>Generic Molecule</th>
                  <th>SKU</th>
                  <th>Dosage Form</th>
                  <th>Unit Price</th>
                  <th>Total Stock</th>
                  <th>Manufacturer</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (m of filteredMedicines(); track m.id) {
                  <tr>
                    <td class="font-mono text-muted">#{{ m.id }}</td>
                    <td>
                      <div class="medicine-name-cell">
                        <span class="med-name">{{ m.name }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="generic-name">{{ m.genericName }}</span>
                    </td>
                    <td>
                      <span class="sku-badge">{{ m.sku }}</span>
                    </td>
                    <td>
                      <span class="form-pill">{{ getDosageFormLabel(m.dosageForm) }}</span>
                    </td>
                    <td class="font-mono text-primary font-semibold">
                      {{ m.unitPrice | currency:'USD':'symbol':'1.2-2' }}
                    </td>
                    <td>
                      <span
                        class="stock-badge"
                        [ngClass]="{
                          'stock-ok': m.totalStock > 10,
                          'stock-low': m.totalStock > 0 && m.totalStock <= 10,
                          'stock-out': m.totalStock === 0
                        }"
                      >
                        {{ m.totalStock }} units
                      </span>
                    </td>
                    <td class="text-secondary">{{ m.manufacturer }}</td>
                    <td class="text-right actions-cell">
                      <button (click)="openEditModal(m)" class="btn-action edit" title="Edit Medicine">
                        ✏️ Edit
                      </button>
                      <button (click)="openDeleteConfirm(m)" class="btn-action delete" title="Delete Medicine">
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Create / Edit Medicine Modal -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon">{{ isEditing() ? '✏️' : '💊' }}</span>
                <h3>{{ isEditing() ? 'Edit Medicine' : 'Add New Medicine' }}</h3>
              </div>
              <button (click)="closeModal()" class="btn-close" aria-label="Close">&times;</button>
            </div>

            <form [formGroup]="medicineForm" (ngSubmit)="onSubmit()" class="medicine-form">
              <div class="form-grid">
                <div class="form-group full-width">
                  <label for="name">Medicine Trade Name *</label>
                  <input
                    id="name"
                    type="text"
                    formControlName="name"
                    placeholder="e.g. Lipitor, Amoxil, Panadol Extra"
                  />
                  @if (medicineForm.get('name')?.touched && medicineForm.get('name')?.invalid) {
                    <span class="field-error">Medicine name is required</span>
                  }
                </div>

                <div class="form-group">
                  <label for="genericName">Generic Name / Molecule *</label>
                  <input
                    id="genericName"
                    type="text"
                    formControlName="genericName"
                    placeholder="e.g. Atorvastatin, Amoxicillin"
                  />
                  @if (medicineForm.get('genericName')?.touched && medicineForm.get('genericName')?.invalid) {
                    <span class="field-error">Generic molecule name is required</span>
                  }
                </div>

                <div class="form-group">
                  <label for="sku">SKU / Barcode *</label>
                  <input
                    id="sku"
                    type="text"
                    formControlName="sku"
                    placeholder="e.g. MED-AMX-500, SKU-09823"
                  />
                  @if (medicineForm.get('sku')?.touched && medicineForm.get('sku')?.invalid) {
                    <span class="field-error">Valid SKU is required</span>
                  }
                </div>

                <div class="form-group">
                  <label for="dosageForm">Dosage Form *</label>
                  <select id="dosageForm" formControlName="dosageForm">
                    @for (opt of dosageFormOptions; track opt.value) {
                      <option [value]="opt.value">{{ opt.label }}</option>
                    }
                  </select>
                  @if (medicineForm.get('dosageForm')?.touched && medicineForm.get('dosageForm')?.invalid) {
                    <span class="field-error">Dosage form is required</span>
                  }
                </div>

                <div class="form-group">
                  <label for="unitPrice">Unit Price ($) *</label>
                  <input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    formControlName="unitPrice"
                    placeholder="0.00"
                  />
                  @if (medicineForm.get('unitPrice')?.touched && medicineForm.get('unitPrice')?.invalid) {
                    <span class="field-error">Price must be greater than 0</span>
                  }
                </div>

                <div class="form-group full-width">
                  <label for="manufacturer">Manufacturer / Pharmaceutical Lab *</label>
                  <input
                    id="manufacturer"
                    type="text"
                    formControlName="manufacturer"
                    placeholder="e.g. Pfizer, Novartis, GlaxoSmithKline"
                  />
                  @if (medicineForm.get('manufacturer')?.touched && medicineForm.get('manufacturer')?.invalid) {
                    <span class="field-error">Manufacturer is required</span>
                  }
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" (click)="closeModal()" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="medicineForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Saving...' : (isEditing() ? 'Save Changes' : 'Create Medicine') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal() && medicineToDelete()) {
        <div class="modal-backdrop" (click)="closeDeleteModalOnBackdrop($event)">
          <div class="modal-card modal-delete">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon text-danger">⚠️</span>
                <h3>Confirm Deletion</h3>
              </div>
              <button (click)="closeDeleteModal()" class="btn-close">&times;</button>
            </div>
            <div class="modal-body-delete">
              <p>
                Are you sure you want to delete
                <strong class="text-white">{{ medicineToDelete()?.name }}</strong>
                (SKU: <span class="font-mono text-primary">{{ medicineToDelete()?.sku }}</span>)?
              </p>
              <p class="warning-subtext">
                This item will be removed from the pharmacy catalog. Any active stock or historical records will be affected.
              </p>
            </div>
            <div class="modal-footer">
              <button type="button" (click)="closeDeleteModal()" class="btn-secondary">Cancel</button>
              <button
                type="button"
                (click)="confirmDelete()"
                [disabled]="isSubmitting()"
                class="btn-danger"
              >
                {{ isSubmitting() ? 'Deleting...' : 'Delete Medicine' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #f1f5f9;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 0.25rem;
    }

    .page-header p {
      color: #94a3b8;
      font-size: 0.95rem;
      margin: 0;
    }

    /* Quick Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }

    .stat-icon {
      font-size: 1.75rem;
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }

    .stat-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    /* Buttons */
    .btn-primary {
      background: #3b82f6;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:hover {
      background: #2563eb;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: #334155;
      color: #cbd5e1;
      border: 1px solid #475569;
      border-radius: 8px;
      padding: 0.65rem 1.25rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      background: #475569;
      color: #ffffff;
    }

    .btn-danger {
      background: #ef4444;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.65rem 1.25rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Alerts */
    .alert {
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
    }

    .alert.success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6ee7b7;
    }

    .alert.error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    /* Content Card & Table */
    .content-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }

    .table-actions {
      padding: 1.25rem 1.5rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      max-width: 450px;
    }

    .search-icon {
      position: absolute;
      left: 0.85rem;
      color: #94a3b8;
      font-size: 0.85rem;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.65rem 2.2rem 0.65rem 2.4rem;
      color: #f1f5f9;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .btn-clear {
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .btn-clear:hover {
      color: #f1f5f9;
    }

    .count-badge {
      font-size: 0.8rem;
      background: #0f172a;
      color: #94a3b8;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid #334155;
      font-weight: 600;
    }

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
      color: #94a3b8;
      font-weight: 600;
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid #334155;
      white-space: nowrap;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .data-table tbody tr {
      background: #1e293b;
      transition: background 0.15s ease;
    }

    .data-table tbody tr:nth-child(even) {
      background: #182234;
    }

    .data-table tbody tr:hover {
      background: #334155;
    }

    .data-table td {
      padding: 0.95rem 1.25rem;
      border-bottom: 1px solid #334155;
      color: #f1f5f9;
      vertical-align: middle;
    }

    .med-name {
      font-weight: 600;
      color: #f1f5f9;
    }

    .generic-name {
      color: #94a3b8;
      font-style: italic;
    }

    .sku-badge {
      font-family: monospace;
      font-size: 0.8rem;
      background: #0f172a;
      color: #93c5fd;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #334155;
    }

    .form-pill {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(147, 197, 253, 0.15);
      color: #93c5fd;
      padding: 2px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(147, 197, 253, 0.25);
    }

    .stock-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 9999px;
    }

    .stock-ok {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .stock-low {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .stock-out {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .font-mono { font-family: monospace; }
    .font-semibold { font-weight: 600; }
    .text-primary { color: #3b82f6; }
    .text-muted { color: #64748b; }
    .text-secondary { color: #94a3b8; }
    .text-success { color: #10b981; }
    .text-warning { color: #f59e0b; }
    .text-danger { color: #ef4444; }
    .text-info { color: #38bdf8; }
    .text-white { color: #ffffff; }
    .text-right { text-align: right; }

    .actions-cell {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .btn-action {
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .btn-action.edit {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .btn-action.edit:hover {
      background: #3b82f6;
      color: #ffffff;
    }

    .btn-action.delete {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .btn-action.delete:hover {
      background: #ef4444;
      color: #ffffff;
    }

    /* State Boxes (Loading / Empty) */
    .state-box {
      padding: 4rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      color: #94a3b8;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-icon {
      font-size: 3rem;
      opacity: 0.6;
    }

    .empty-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    .empty-subtitle {
      font-size: 0.875rem;
      color: #94a3b8;
      margin: 0;
    }

    /* Modal Backdrop and Card */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1.5rem;
    }

    .modal-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .modal-delete {
      max-width: 480px;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      background: #0f172a;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      transition: color 0.15s;
    }

    .btn-close:hover {
      color: #f1f5f9;
    }

    .medicine-form {
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    .form-group input,
    .form-group select {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: #f1f5f9;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .field-error {
      color: #f87171;
      font-size: 0.75rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #334155;
    }

    .modal-body-delete {
      padding: 1.5rem;
      color: #cbd5e1;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .modal-body-delete p {
      margin: 0 0 0.75rem;
    }

    .warning-subtext {
      color: #94a3b8;
      font-size: 0.85rem;
    }
  `]
})
export class MedicinesComponent implements OnInit {
  private pharmacyService = inject(PharmacyServicePort);
  private fb = inject(FormBuilder);

  // State Signals
  medicines = signal<Medicine[]>([]);
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId = signal<number | null>(null);
  showDeleteModal = signal<boolean>(false);
  medicineToDelete = signal<Medicine | null>(null);

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Dosage Form options
  dosageFormOptions = [
    { value: DosageForm.Tablet, label: DosageFormNames[DosageForm.Tablet] },
    { value: DosageForm.Capsule, label: DosageFormNames[DosageForm.Capsule] },
    { value: DosageForm.Syrup, label: DosageFormNames[DosageForm.Syrup] },
    { value: DosageForm.Injection, label: DosageFormNames[DosageForm.Injection] },
    { value: DosageForm.Ointment, label: DosageFormNames[DosageForm.Ointment] },
    { value: DosageForm.Drops, label: DosageFormNames[DosageForm.Drops] },
    { value: DosageForm.Inhaler, label: DosageFormNames[DosageForm.Inhaler] }
  ];

  // Computed signals
  filteredMedicines = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.medicines();
    return this.medicines().filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.genericName.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q) ||
      m.manufacturer.toLowerCase().includes(q)
    );
  });

  inStockCount = computed(() =>
    this.medicines().filter(m => m.totalStock > 10).length
  );

  lowStockCount = computed(() =>
    this.medicines().filter(m => m.totalStock <= 10).length
  );

  dosageFormsCount = computed(() =>
    new Set(this.medicines().map(m => m.dosageForm)).size
  );

  // Form definition
  medicineForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    genericName: ['', [Validators.required, Validators.maxLength(150)]],
    sku: ['', [Validators.required, Validators.maxLength(50)]],
    dosageForm: [DosageForm.Tablet, [Validators.required]],
    unitPrice: [1.0, [Validators.required, Validators.min(0.01)]],
    manufacturer: ['', [Validators.required, Validators.maxLength(150)]]
  });

  ngOnInit(): void {
    this.loadMedicines();
  }

  loadMedicines(): void {
    this.isLoading.set(true);
    this.pharmacyService.getMedicines().subscribe({
      next: res => {
        this.medicines.set(res.data || []);
        this.isLoading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Failed to load medicines from pharmacy service.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchQuery.set(term);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  getDosageFormLabel(form: DosageForm): string {
    return DosageFormNames[form] || 'Form #' + form;
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.medicineForm.reset({
      name: '',
      genericName: '',
      sku: '',
      dosageForm: DosageForm.Tablet,
      unitPrice: 1.0,
      manufacturer: ''
    });
    this.showModal.set(true);
  }

  openEditModal(med: Medicine): void {
    this.isEditing.set(true);
    this.editingId.set(med.id);
    this.medicineForm.patchValue({
      name: med.name,
      genericName: med.genericName,
      sku: med.sku,
      dosageForm: med.dosageForm,
      unitPrice: med.unitPrice,
      manufacturer: med.manufacturer
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.medicineForm.reset();
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  onSubmit(): void {
    if (this.medicineForm.invalid) {
      this.medicineForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.medicineForm.value;

    const dto: CreateMedicineDto = {
      name: formVal.name!.trim(),
      genericName: formVal.genericName!.trim(),
      sku: formVal.sku!.trim(),
      dosageForm: Number(formVal.dosageForm) as DosageForm,
      unitPrice: Number(formVal.unitPrice),
      manufacturer: formVal.manufacturer!.trim()
    };

    if (this.isEditing() && this.editingId()) {
      const updateDto: UpdateMedicineDto = { ...dto };
      this.pharmacyService.updateMedicine(this.editingId()!, updateDto).subscribe({
        next: res => {
          this.isSubmitting.set(false);
          this.closeModal();
          const medName = res.data?.name || dto.name;
          this.showAlert(`Medicine "${medName}" updated successfully.`, 'success');
          this.loadMedicines();
        },
        error: err => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Failed to update medicine.', 'error');
        }
      });
    } else {
      this.pharmacyService.createMedicine(dto).subscribe({
        next: res => {
          this.isSubmitting.set(false);
          this.closeModal();
          const medName = res.data?.name || dto.name;
          this.showAlert(`Medicine "${medName}" registered successfully.`, 'success');
          this.loadMedicines();
        },
        error: err => {
          this.isSubmitting.set(false);
          this.showAlert(err.error?.message || 'Failed to create medicine.', 'error');
        }
      });
    }
  }

  openDeleteConfirm(med: Medicine): void {
    this.medicineToDelete.set(med);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.medicineToDelete.set(null);
  }

  closeDeleteModalOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeDeleteModal();
    }
  }

  confirmDelete(): void {
    const med = this.medicineToDelete();
    if (!med) return;

    this.isSubmitting.set(true);
    this.pharmacyService.deleteMedicine(med.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeDeleteModal();
        this.showAlert(`Medicine "${med.name}" was successfully removed.`, 'success');
        this.loadMedicines();
      },
      error: err => {
        this.isSubmitting.set(false);
        this.showAlert(err.error?.message || 'Failed to delete medicine.', 'error');
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 4500);
  }
}
