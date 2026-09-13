// ============================================================
// Presentation Layer — Lab Tests Component
// Catalog management for clinical diagnostic laboratory tests
// ============================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LaboratoryServicePort } from '../../../../application/ports/laboratory.port';
import { LabTest, CreateLabTestDto, UpdateLabTestDto } from '../../../../domain/models/laboratory.models';

@Component({
  selector: 'app-lab-tests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-titles">
          <h1>🔬 Lab Tests Catalog</h1>
          <p>Configure diagnostic tests, normal reference ranges, unit metrics, and pricing</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">
          <span>+</span> Add Lab Test
        </button>
      </div>

      <!-- Alert Notification -->
      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType()">
          <span class="alert-icon">{{ alertType() === 'success' ? '✓' : '⚠️' }}</span>
          <span>{{ alertMessage() }}</span>
        </div>
      }

      <!-- Main Content Card -->
      <div class="content-card">
        <!-- Filter and Search Bar -->
        <div class="table-actions">
          <div class="filter-group">
            <div class="search-wrapper">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by code, test name, category..."
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                class="search-input"
              />
            </div>
            <select
              [value]="selectedCategory()"
              (change)="onCategoryChange($event)"
              class="filter-select"
            >
              <option value="ALL">All Categories</option>
              @for (cat of categories(); track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
          </div>
          <span class="count-badge">{{ filteredLabTests().length }} Tests</span>
        </div>

        <!-- Table / Loading / Empty States -->
        @if (isLoading()) {
          <div class="state-box">
            <div class="spinner"></div>
            <p>Loading laboratory test catalog...</p>
          </div>
        } @else if (filteredLabTests().length === 0) {
          <div class="state-box">
            <span class="empty-icon">🧪</span>
            <p>No laboratory tests match your criteria.</p>
            @if (searchQuery() || selectedCategory() !== 'ALL') {
              <button (click)="clearFilters()" class="btn-secondary btn-sm">Clear Filters</button>
            }
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Test Name</th>
                  <th>Category</th>
                  <th>Normal Range</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Description</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (test of filteredLabTests(); track test.id) {
                  <tr>
                    <td>
                      <span class="code-badge">{{ test.code }}</span>
                    </td>
                    <td class="font-semibold text-primary">{{ test.name }}</td>
                    <td>
                      <span class="category-pill">{{ test.category }}</span>
                    </td>
                    <td class="font-mono text-range">{{ test.normalRange }}</td>
                    <td class="text-secondary font-mono">{{ test.unitOfMeasure }}</td>
                    <td class="font-semibold text-price">
                      {{ test.price | currency:'USD':'symbol':'1.2-2' }}
                    </td>
                    <td class="text-secondary desc-cell" [title]="test.description || ''">
                      {{ test.description || '—' }}
                    </td>
                    <td class="text-right actions-cell">
                      <button
                        (click)="openEditModal(test)"
                        class="btn-action edit"
                        title="Edit lab test"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        (click)="confirmDelete(test)"
                        class="btn-action delete"
                        title="Delete lab test"
                      >
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

      <!-- Create / Edit Lab Test Modal -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon">{{ isEditing() ? '✏️' : '🔬' }}</span>
                <h3>{{ isEditing() ? 'Edit Lab Test' : 'Add New Lab Test' }}</h3>
              </div>
              <button (click)="closeModal()" class="btn-close" type="button">&times;</button>
            </div>

            <form [formGroup]="testForm" (ngSubmit)="onSubmit()" class="modal-form">
              <div class="form-row">
                <div class="form-group">
                  <label>Test Code *</label>
                  <input
                    type="text"
                    formControlName="code"
                    placeholder="e.g. CBC-001, GLUC-01"
                    [class.invalid]="isFieldInvalid('code')"
                  />
                  @if (isFieldInvalid('code')) {
                    <span class="field-error">Test code is required (max 20 chars)</span>
                  }
                </div>
                <div class="form-group">
                  <label>Test Name *</label>
                  <input
                    type="text"
                    formControlName="name"
                    placeholder="e.g. Complete Blood Count"
                    [class.invalid]="isFieldInvalid('name')"
                  />
                  @if (isFieldInvalid('name')) {
                    <span class="field-error">Test name is required</span>
                  }
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    formControlName="category"
                    placeholder="e.g. Hematology, Biochemistry, Immunology"
                    [class.invalid]="isFieldInvalid('category')"
                  />
                  @if (isFieldInvalid('category')) {
                    <span class="field-error">Category is required</span>
                  }
                </div>
                <div class="form-group">
                  <label>Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    formControlName="price"
                    placeholder="0.00"
                    [class.invalid]="isFieldInvalid('price')"
                  />
                  @if (isFieldInvalid('price')) {
                    <span class="field-error">Valid positive price is required</span>
                  }
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Normal Reference Range *</label>
                  <input
                    type="text"
                    formControlName="normalRange"
                    placeholder="e.g. 4.5 - 11.0, 70 - 99, Negative"
                    [class.invalid]="isFieldInvalid('normalRange')"
                  />
                  @if (isFieldInvalid('normalRange')) {
                    <span class="field-error">Reference range is required</span>
                  }
                </div>
                <div class="form-group">
                  <label>Unit of Measure *</label>
                  <input
                    type="text"
                    formControlName="unitOfMeasure"
                    placeholder="e.g. 10^3/µL, mg/dL, mmol/L, N/A"
                    [class.invalid]="isFieldInvalid('unitOfMeasure')"
                  />
                  @if (isFieldInvalid('unitOfMeasure')) {
                    <span class="field-error">Unit is required</span>
                  }
                </div>
              </div>

              <div class="form-group">
                <label>Description (Optional)</label>
                <textarea
                  formControlName="description"
                  rows="3"
                  placeholder="Clinical significance, methodology, or patient preparation notes..."
                ></textarea>
              </div>

              <div class="modal-actions">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="btn-secondary"
                  [disabled]="isSubmitting()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="testForm.invalid || isSubmitting()"
                  class="btn-primary"
                >
                  @if (isSubmitting()) {
                    <span class="mini-spinner"></span>
                    <span>Saving...</span>
                  } @else {
                    <span>{{ isEditing() ? 'Update Test' : 'Create Test' }}</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (testToDelete()) {
        <div class="modal-backdrop" (click)="cancelDelete()">
          <div class="modal-card delete-card" (click)="$event.stopPropagation()">
            <div class="delete-header">
              <div class="delete-icon-wrap">🗑️</div>
              <h3>Confirm Lab Test Deletion</h3>
            </div>
            <p class="delete-message">
              Are you sure you want to delete <strong>{{ testToDelete()?.name }}</strong>
              (<code>{{ testToDelete()?.code }}</code>)? This test will be removed from the catalog.
            </p>
            <div class="modal-actions">
              <button
                type="button"
                (click)="cancelDelete()"
                class="btn-secondary"
                [disabled]="isSubmitting()"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="executeDelete()"
                class="btn-danger"
                [disabled]="isSubmitting()"
              >
                @if (isSubmitting()) {
                  <span class="mini-spinner"></span>
                  <span>Deleting...</span>
                } @else {
                  <span>Delete Test</span>
                }
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
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #f1f5f9;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-titles h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .header-titles p {
      color: #94a3b8;
      font-size: 0.95rem;
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
      transition: background 0.2s, transform 0.1s;
    }
    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #334155;
      color: #f1f5f9;
      border: 1px solid #475569;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #475569;
    }

    .btn-danger {
      background: #ef4444;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
    }
    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-sm {
      padding: 0.4rem 0.85rem;
      font-size: 0.8rem;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .btn-close:hover {
      color: #f1f5f9;
      background: #334155;
    }

    /* Alerts */
    .alert {
      padding: 1rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
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
    .alert-icon {
      font-weight: bold;
    }

    /* Card */
    .content-card {
      background: #1e293b;
      border-radius: 12px;
      border: 1px solid #334155;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }

    .table-actions {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      background: #1e293b;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      font-size: 0.85rem;
      pointer-events: none;
      opacity: 0.6;
    }
    .search-input {
      background: #0f172a;
      border: 1px solid #334155;
      color: #f1f5f9;
      padding: 0.6rem 1rem 0.6rem 2.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      width: 320px;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: #3b82f6;
    }
    .search-input::placeholder {
      color: #64748b;
    }

    .filter-select {
      background: #0f172a;
      border: 1px solid #334155;
      color: #f1f5f9;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .filter-select:focus {
      border-color: #3b82f6;
    }

    .count-badge {
      font-size: 0.8rem;
      background: #0f172a;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-weight: 600;
    }

    /* States */
    .state-box {
      padding: 4rem 2rem;
      text-align: center;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .empty-icon {
      font-size: 2.5rem;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #334155;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .mini-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
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
      white-space: nowrap;
    }
    .data-table td {
      padding: 0.95rem 1.25rem;
      border-bottom: 1px solid #334155;
      color: #f1f5f9;
      vertical-align: middle;
    }
    .data-table tbody tr {
      background: #1e293b;
      transition: background 0.15s;
    }
    .data-table tbody tr:nth-child(even) {
      background: rgba(15, 23, 42, 0.45);
    }
    .data-table tbody tr:hover {
      background: #334155;
    }

    .code-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
      background: #0f172a;
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
      white-space: nowrap;
    }
    .category-pill {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.3);
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      white-space: nowrap;
    }
    .font-semibold { font-weight: 600; }
    .text-primary { color: #f1f5f9; }
    .text-secondary { color: #94a3b8; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-range { color: #a5f3fc; }
    .text-price { color: #34d399; }
    .desc-cell {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.825rem;
    }
    .text-right { text-align: right; }

    .actions-cell {
      white-space: nowrap;
    }
    .btn-action {
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      margin-left: 0.4rem;
      transition: all 0.15s;
    }
    .btn-action.edit {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .btn-action.edit:hover {
      background: rgba(59, 130, 246, 0.3);
      color: #93c5fd;
    }
    .btn-action.delete {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .btn-action.delete:hover {
      background: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.85);
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
      max-width: 620px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
    }
    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .modal-title-wrap h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }
    .modal-icon {
      font-size: 1.2rem;
    }

    .modal-form {
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.02em;
    }
    .form-group input,
    .form-group textarea {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      padding: 0.65rem 0.85rem;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-group input:focus,
    .form-group textarea:focus {
      border-color: #3b82f6;
    }
    .form-group input.invalid {
      border-color: #ef4444;
    }
    .field-error {
      font-size: 0.75rem;
      color: #f87171;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #334155;
    }

    /* Delete Card */
    .delete-card {
      max-width: 480px;
      padding: 1.5rem;
      text-align: center;
    }
    .delete-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .delete-icon-wrap {
      font-size: 2.25rem;
      background: rgba(239, 68, 68, 0.15);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .delete-header h3 {
      margin: 0;
      font-size: 1.15rem;
      color: #f1f5f9;
    }
    .delete-message {
      color: #94a3b8;
      font-size: 0.9rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .delete-message strong {
      color: #f1f5f9;
    }
    .delete-message code {
      background: #0f172a;
      color: #38bdf8;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }
  `]
})
export class LabTestsComponent implements OnInit {
  private labService = inject(LaboratoryServicePort);
  private fb = inject(FormBuilder);

  // State Signals
  labTests = signal<LabTest[]>([]);
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('ALL');
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  showModal = signal<boolean>(false);
  editingTest = signal<LabTest | null>(null);
  testToDelete = signal<LabTest | null>(null);

  // Alerts
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Computed Properties
  isEditing = computed(() => this.editingTest() !== null);

  categories = computed(() => {
    const set = new Set<string>();
    this.labTests().forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  });

  filteredLabTests = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();

    return this.labTests().filter(test => {
      const matchesCat = cat === 'ALL' || test.category === cat;
      const matchesQuery =
        !query ||
        test.code.toLowerCase().includes(query) ||
        test.name.toLowerCase().includes(query) ||
        test.category.toLowerCase().includes(query) ||
        (test.description && test.description.toLowerCase().includes(query));

      return matchesCat && matchesQuery;
    });
  });

  // Reactive Form
  testForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    category: ['', [Validators.required, Validators.maxLength(50)]],
    normalRange: ['', Validators.required],
    unitOfMeasure: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    description: ['']
  });

  ngOnInit(): void {
    this.loadTests();
  }

  loadTests(): void {
    this.isLoading.set(true);
    this.labService.getLabTests().subscribe({
      next: res => {
        this.labTests.set(res.data || []);
        this.isLoading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Failed to load laboratory tests catalog.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onCategoryChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCategory.set(val);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('ALL');
  }

  isFieldInvalid(fieldName: string): boolean {
    const ctrl = this.testForm.get(fieldName);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  openCreateModal(): void {
    this.editingTest.set(null);
    this.testForm.reset({
      code: '',
      name: '',
      category: '',
      normalRange: '',
      unitOfMeasure: '',
      price: 0,
      description: ''
    });
    this.showModal.set(true);
  }

  openEditModal(test: LabTest): void {
    this.editingTest.set(test);
    this.testForm.reset({
      code: test.code,
      name: test.name,
      category: test.category,
      normalRange: test.normalRange,
      unitOfMeasure: test.unitOfMeasure,
      price: test.price,
      description: test.description || ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingTest.set(null);
    this.testForm.reset();
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  onSubmit(): void {
    if (this.testForm.invalid) {
      this.testForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.testForm.value;

    const dto: CreateLabTestDto = {
      code: formVal.code!.trim(),
      name: formVal.name!.trim(),
      category: formVal.category!.trim(),
      normalRange: formVal.normalRange!.trim(),
      unitOfMeasure: formVal.unitOfMeasure!.trim(),
      price: Number(formVal.price),
      description: formVal.description ? formVal.description.trim() : undefined
    };

    const current = this.editingTest();
    if (current) {
      // Update
      this.labService.updateLabTest(current.id, dto as UpdateLabTestDto).subscribe({
        next: () => {
          this.showAlert(`Test "${dto.name}" updated successfully.`, 'success');
          this.closeModal();
          this.loadTests();
          this.isSubmitting.set(false);
        },
        error: err => {
          this.showAlert(err.error?.message || 'Failed to update lab test.', 'error');
          this.isSubmitting.set(false);
        }
      });
    } else {
      // Create
      this.labService.createLabTest(dto).subscribe({
        next: () => {
          this.showAlert(`Test "${dto.name}" created successfully.`, 'success');
          this.closeModal();
          this.loadTests();
          this.isSubmitting.set(false);
        },
        error: err => {
          this.showAlert(err.error?.message || 'Failed to create lab test.', 'error');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  confirmDelete(test: LabTest): void {
    this.testToDelete.set(test);
  }

  cancelDelete(): void {
    this.testToDelete.set(null);
  }

  executeDelete(): void {
    const test = this.testToDelete();
    if (!test) return;

    this.isSubmitting.set(true);
    this.labService.deleteLabTest(test.id).subscribe({
      next: () => {
        this.showAlert(`Test "${test.name}" deleted successfully.`, 'success');
        this.testToDelete.set(null);
        this.loadTests();
        this.isSubmitting.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Failed to delete lab test.', 'error');
        this.isSubmitting.set(false);
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => {
      this.alertMessage.set(null);
    }, 4000);
  }
}
