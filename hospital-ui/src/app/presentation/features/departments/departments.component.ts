// ============================================================
// Presentation Layer — Departments Component
// Full CRUD management for hospital clinical departments
// ============================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicalServicePort } from '../../../application/ports/clinical.port';
import { Department, CreateDepartmentDto, UpdateDepartmentDto } from '../../../domain/models/clinical.models';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Hospital Departments</h1>
          <p>Organize, configure, and manage medical divisions and specialty units</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">+ Add Department</button>
      </div>

      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType()">
          {{ alertMessage() }}
        </div>
      }

      <div class="content-card">
        <div class="table-actions">
          <input
            type="text"
            placeholder="Search departments..."
            (input)="onSearch($event)"
            class="search-input"
          />
          <span class="count-badge">{{ filteredDepartments().length }} Departments</span>
        </div>

        @if (isLoading()) {
          <div class="loading-box">Loading departments...</div>
        } @else if (filteredDepartments().length === 0) {
          <div class="empty-box">No departments found.</div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (d of filteredDepartments(); track d.id) {
                  <tr>
                    <td class="font-mono">#{{ d.id }}</td>
                    <td class="font-semibold text-primary">{{ d.name }}</td>
                    <td class="text-muted">{{ d.description || '—' }}</td>
                    <td class="text-right actions-cell">
                      <button (click)="openEditModal(d)" class="btn-action edit" title="Edit department">
                        ✏️ Edit
                      </button>
                      <button (click)="onDelete(d)" class="btn-action delete" title="Delete department">
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

      <!-- Create / Edit Modal -->
      @if (showModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h3>{{ isEditing() ? 'Edit Department' : 'Add New Department' }}</h3>
              <button (click)="closeModal()" class="btn-close">&times;</button>
            </div>

            <form [formGroup]="deptForm" (ngSubmit)="onSubmit()" class="dept-form">
              <div class="form-group">
                <label>Department Name *</label>
                <input type="text" formControlName="name" placeholder="e.g. Cardiology, Neurology" />
                @if (deptForm.get('name')?.touched && deptForm.get('name')?.invalid) {
                  <span class="field-error">Department name is required</span>
                }
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea formControlName="description" rows="3" placeholder="Brief overview of department specialty..."></textarea>
              </div>

              <div class="modal-actions">
                <button type="button" (click)="closeModal()" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="deptForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Saving...' : (isEditing() ? 'Update' : 'Create') }}
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
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.25rem;
    }
    .page-header p {
      color: #64748b;
      font-size: 0.95rem;
    }
    .btn-primary {
      background: #0284c7;
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.2s;
    }
    .btn-primary:hover { background: #0369a1; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #e2e8f0; }
    .alert {
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }
    .alert.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .content-card {
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .table-actions {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .search-input {
      padding: 0.5rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      width: 320px;
      font-size: 0.875rem;
    }
    .count-badge {
      font-size: 0.8rem;
      background: #f1f5f9;
      color: #475569;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
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
      background: #f8fafc;
      padding: 0.75rem 1.5rem;
      color: #475569;
      font-weight: 600;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 0.85rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .data-table tr:hover { background: #f8fafc; }
    .font-mono { font-family: monospace; color: #64748b; }
    .font-semibold { font-weight: 600; }
    .text-primary { color: #0284c7; }
    .text-muted { color: #64748b; }
    .text-right { text-align: right; }
    .actions-cell {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .btn-action {
      padding: 0.35rem 0.65rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .btn-action.edit {
      background: #f0f9ff;
      color: #0284c7;
      border: 1px solid #bae6fd;
    }
    .btn-action.edit:hover { background: #e0f2fe; }
    .btn-action.delete {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .btn-action.delete:hover { background: #fee2e2; }
    .loading-box, .empty-box {
      padding: 3rem;
      text-align: center;
      color: #64748b;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .modal-card {
      background: white;
      border-radius: 0.75rem;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
    }
    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      color: #94a3b8;
      cursor: pointer;
    }
    .dept-form {
      padding: 1.5rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
    }
    .form-group input, .form-group textarea {
      padding: 0.55rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
    .field-error {
      color: #dc2626;
      font-size: 0.75rem;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
  `]
})
export class DepartmentsComponent implements OnInit {
  private clinicalService = inject(ClinicalServicePort);
  private fb = inject(FormBuilder);

  departments = signal<Department[]>([]);
  filteredDepartments = signal<Department[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  showModal = signal(false);
  isEditing = signal(false);
  editingId = signal<number | null>(null);

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  deptForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['']
  });

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.isLoading.set(true);
    this.clinicalService.getDepartments().subscribe({
      next: res => {
        const list = res.data || [];
        this.departments.set(list);
        this.filteredDepartments.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.showAlert('Failed to load departments.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredDepartments.set(
      this.departments().filter(d =>
        d.name.toLowerCase().includes(query) || (d.description && d.description.toLowerCase().includes(query))
      )
    );
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.deptForm.reset();
    this.showModal.set(true);
  }

  openEditModal(dept: Department): void {
    this.isEditing.set(true);
    this.editingId.set(dept.id);
    this.deptForm.patchValue({
      name: dept.name,
      description: dept.description || ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.deptForm.reset();
  }

  onSubmit(): void {
    if (this.deptForm.invalid) return;
    this.isSubmitting.set(true);

    const formVal = this.deptForm.value;
    const dto: CreateDepartmentDto = {
      name: formVal.name!,
      description: formVal.description || undefined
    };

    if (this.isEditing() && this.editingId()) {
      const updateDto: UpdateDepartmentDto = { ...dto };
      this.clinicalService.updateDepartment(this.editingId()!, updateDto).subscribe({
        next: () => {
          this.showAlert('Department updated successfully.', 'success');
          this.closeModal();
          this.loadDepartments();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.showAlert('Failed to update department.', 'error');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.clinicalService.createDepartment(dto).subscribe({
        next: () => {
          this.showAlert('Department created successfully.', 'success');
          this.closeModal();
          this.loadDepartments();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.showAlert('Failed to create department.', 'error');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  onDelete(dept: Department): void {
    if (!confirm(`Are you sure you want to delete department "${dept.name}"?`)) return;

    this.clinicalService.deleteDepartment(dept.id).subscribe({
      next: () => {
        this.showAlert(`Department "${dept.name}" deleted.`, 'success');
        this.loadDepartments();
      },
      error: () => {
        this.showAlert('Failed to delete department.', 'error');
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 4000);
  }
}
