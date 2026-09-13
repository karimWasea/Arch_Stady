// ============================================================
// Presentation Layer — Doctors Component
// Full CRUD management for hospital medical staff & specialists
// ============================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClinicalServicePort } from '../../../application/ports/clinical.port';
import { Doctor, CreateDoctorDto, UpdateDoctorDto, Department } from '../../../domain/models/clinical.models';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Medical Specialists & Staff</h1>
          <p>Directory of licensed clinical doctors and medical specialists across hospital departments</p>
        </div>
        <button (click)="openCreateModal()" class="btn-primary">+ Add New Doctor</button>
      </div>

      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType()">
          {{ alertMessage() }}
        </div>
      }

      @if (isLoading()) {
        <div class="loading-box">Loading medical staff directory...</div>
      } @else if (doctors().length === 0) {
        <div class="empty-box">No doctors found.</div>
      } @else {
        <div class="doctors-grid">
          @for (d of doctors(); track d.id) {
            <div class="doctor-card">
              <div class="card-top-actions">
                <button (click)="openEditModal(d)" class="btn-mini edit" title="Edit Doctor">✏️</button>
                <button (click)="onDelete(d)" class="btn-mini delete" title="Delete Doctor">🗑️</button>
              </div>

              <div class="avatar">👨‍⚕️</div>
              <div class="info">
                <h3>Dr. {{ d.firstName }} {{ d.lastName }}</h3>
                <span class="specialization">{{ d.specialization }}</span>
                <span class="dept-badge">{{ d.departmentName || 'Department #' + d.departmentId }}</span>

                <div class="contact-details">
                  <div class="contact-item">
                    <span>📧</span>
                    <a [href]="'mailto:' + d.email">{{ d.email }}</a>
                  </div>
                  <div class="contact-item">
                    <span>📞</span>
                    <span>{{ d.phone }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Add / Edit Doctor Modal -->
      @if (showModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h3>{{ isEditing() ? 'Edit Doctor Profile' : 'Add New Doctor' }}</h3>
              <button (click)="closeModal()" class="btn-close">&times;</button>
            </div>

            <form [formGroup]="doctorForm" (ngSubmit)="onSubmit()" class="doctor-form">
              <div class="form-row">
                <div class="form-group">
                  <label>First Name *</label>
                  <input type="text" formControlName="firstName" placeholder="Jane" />
                </div>
                <div class="form-group">
                  <label>Last Name *</label>
                  <input type="text" formControlName="lastName" placeholder="Smith" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Specialization *</label>
                  <input type="text" formControlName="specialization" placeholder="Cardiology, Pediatrics..." />
                </div>
                <div class="form-group">
                  <label>Department *</label>
                  <select formControlName="departmentId">
                    <option value="">Select Department</option>
                    @for (dept of departments(); track dept.id) {
                      <option [value]="dept.id">{{ dept.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Phone Number *</label>
                  <input type="text" formControlName="phone" placeholder="+1-555-0123" />
                </div>
                <div class="form-group">
                  <label>Email Address *</label>
                  <input type="email" formControlName="email" placeholder="dr.smith@hospital.com" />
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" (click)="closeModal()" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="doctorForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Saving...' : (isEditing() ? 'Update Doctor' : 'Save Doctor') }}
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
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    p { color: #64748b; margin: 0; }
    .btn-primary {
      background: #0284c7;
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
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
    .alert {
      padding: 1rem;
      border-radius: 0.5rem;
      font-size: 0.9rem;
    }
    .alert.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .doctors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .doctor-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      position: relative;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .doctor-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 15px -3px rgba(0,0,0,0.08);
    }
    .card-top-actions {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      display: flex;
      gap: 0.35rem;
    }
    .btn-mini {
      background: transparent;
      border: 1px solid #e2e8f0;
      border-radius: 0.25rem;
      padding: 0.2rem 0.4rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-mini:hover { background: #f1f5f9; }
    .avatar {
      font-size: 2.5rem;
      width: 64px;
      height: 64px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }
    h3 { font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 0 0 0.25rem; }
    .specialization { font-size: 0.875rem; font-weight: 600; color: #0284c7; }
    .dept-badge {
      display: inline-block;
      margin: 0.5rem 0 1rem;
      background: #f1f5f9;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .contact-details {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: #64748b;
      width: 100%;
      border-top: 1px solid #f1f5f9;
      padding-top: 0.75rem;
    }
    .contact-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .contact-item a { color: #64748b; text-decoration: none; }
    .contact-item a:hover { color: #0284c7; }
    .loading-box, .empty-box { padding: 3rem; text-align: center; color: #64748b; }
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
      max-width: 550px;
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
    .modal-header h3 { font-size: 1.15rem; font-weight: 700; color: #0f172a; }
    .btn-close { background: transparent; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }
    .doctor-form { padding: 1.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: #334155; }
    .form-group input, .form-group select {
      padding: 0.55rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      background: white;
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; }
  `]
})
export class DoctorsComponent implements OnInit {
  private clinicalService = inject(ClinicalServicePort);
  private fb = inject(FormBuilder);

  doctors = signal<Doctor[]>([]);
  departments = signal<Department[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  showModal = signal(false);
  isEditing = signal(false);
  editingId = signal<number | null>(null);

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  doctorForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    specialization: ['', Validators.required],
    departmentId: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      doctors: this.clinicalService.getDoctors(),
      departments: this.clinicalService.getDepartments()
    }).subscribe({
      next: res => {
        this.doctors.set(res.doctors.data || []);
        this.departments.set(res.departments.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.showAlert('Failed to load doctors directory.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.doctorForm.reset({ firstName: '', lastName: '', specialization: '', departmentId: '', phone: '', email: '' });
    this.showModal.set(true);
  }

  openEditModal(doc: Doctor): void {
    this.isEditing.set(true);
    this.editingId.set(doc.id);
    this.doctorForm.patchValue({
      firstName: doc.firstName,
      lastName: doc.lastName,
      specialization: doc.specialization,
      departmentId: String(doc.departmentId),
      phone: doc.phone,
      email: doc.email
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.doctorForm.reset();
  }

  onSubmit(): void {
    if (this.doctorForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.doctorForm.value;
    const dto: CreateDoctorDto = {
      firstName: val.firstName!,
      lastName: val.lastName!,
      specialization: val.specialization!,
      departmentId: Number(val.departmentId),
      phone: val.phone!,
      email: val.email!
    };

    if (this.isEditing() && this.editingId()) {
      const updateDto: UpdateDoctorDto = { ...dto };
      this.clinicalService.updateDoctor(this.editingId()!, updateDto).subscribe({
        next: () => {
          this.showAlert('Doctor updated successfully.', 'success');
          this.closeModal();
          this.loadData();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.showAlert('Failed to update doctor.', 'error');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.clinicalService.createDoctor(dto).subscribe({
        next: () => {
          this.showAlert('Doctor created successfully.', 'success');
          this.closeModal();
          this.loadData();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.showAlert('Failed to create doctor.', 'error');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  onDelete(doc: Doctor): void {
    if (!confirm(`Are you sure you want to remove Dr. ${doc.firstName} ${doc.lastName}?`)) return;

    this.clinicalService.deleteDoctor(doc.id).subscribe({
      next: () => {
        this.showAlert(`Dr. ${doc.firstName} ${doc.lastName} removed.`, 'success');
        this.loadData();
      },
      error: () => {
        this.showAlert('Failed to delete doctor.', 'error');
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 4000);
  }
}
