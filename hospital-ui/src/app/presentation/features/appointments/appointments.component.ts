// ============================================================
// Presentation Layer — Appointments Component
// Scheduling, lifecycle management, and clinician assignment
// ============================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClinicalServicePort } from '../../../application/ports/clinical.port';
import { Appointment, CreateAppointmentDto, Doctor, Patient } from '../../../domain/models/clinical.models';
import { AppointmentStatus } from '../../../domain/enums/enums';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Appointments Management</h1>
          <p>Schedule visits, track clinical consults, and manage appointment lifecycles</p>
        </div>
        <button (click)="openScheduleModal()" class="btn-primary">+ Schedule Appointment</button>
      </div>

      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType()">
          {{ alertMessage() }}
        </div>
      }

      <div class="content-card">
        <div class="filter-bar">
          <div class="filter-buttons">
            <button (click)="setFilter('All')" [class.active]="currentFilter() === 'All'" class="filter-btn">All</button>
            <button (click)="setFilter('Scheduled')" [class.active]="currentFilter() === 'Scheduled'" class="filter-btn scheduled">Scheduled</button>
            <button (click)="setFilter('Completed')" [class.active]="currentFilter() === 'Completed'" class="filter-btn completed">Completed</button>
            <button (click)="setFilter('Cancelled')" [class.active]="currentFilter() === 'Cancelled'" class="filter-btn cancelled">Cancelled</button>
          </div>
          <span class="count-badge">{{ filteredAppointments().length }} Appointments</span>
        </div>

        @if (isLoading()) {
          <div class="loading-box">Loading appointments schedule...</div>
        } @else if (filteredAppointments().length === 0) {
          <div class="empty-box">No appointments found for this filter.</div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Patient</th>
                  <th>Assigned Doctor</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (a of filteredAppointments(); track a.id) {
                  <tr>
                    <td>#{{ a.id }}</td>
                    <td class="font-semibold">{{ a.patientName }}</td>
                    <td>{{ a.doctorName }}</td>
                    <td>{{ a.appointmentDate | date:'medium' }}</td>
                    <td>
                      <span class="status-pill" [ngClass]="a.statusName.toLowerCase()">
                        {{ a.statusName }}
                      </span>
                    </td>
                    <td class="text-muted">{{ a.notes || '—' }}</td>
                    <td>
                      <div class="action-buttons">
                        @if (a.status === 1) { <!-- Scheduled -->
                          <button (click)="complete(a.id)" class="btn-action complete" title="Complete appointment">
                            ✓ Complete
                          </button>
                          <button (click)="cancel(a.id)" class="btn-action cancel" title="Cancel appointment">
                            ✕ Cancel
                          </button>
                        } @else {
                          <span class="text-muted text-xs">Locked</span>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Schedule Modal -->
      @if (showModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h3>Schedule New Appointment</h3>
              <button (click)="closeModal()" class="btn-close">&times;</button>
            </div>

            <form [formGroup]="appointmentForm" (ngSubmit)="onSubmit()" class="modal-form">
              <div class="form-group">
                <label>Select Patient *</label>
                <select formControlName="patientId">
                  <option value="">-- Choose Patient --</option>
                  @for (p of patients(); track p.id) {
                    <option [value]="p.id">{{ p.firstName }} {{ p.lastName }} (#{{ p.id }})</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Select Doctor *</label>
                <select formControlName="doctorId">
                  <option value="">-- Choose Doctor --</option>
                  @for (d of doctors(); track d.id) {
                    <option [value]="d.id">Dr. {{ d.firstName }} {{ d.lastName }} ({{ d.specialization }})</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Appointment Date & Time *</label>
                <input type="datetime-local" formControlName="appointmentDate" />
              </div>

              <div class="form-group">
                <label>Consultation Notes</label>
                <textarea formControlName="notes" rows="3" placeholder="Reason for consultation, symptoms, or instructions..."></textarea>
              </div>

              <div class="modal-footer">
                <button type="button" (click)="closeModal()" class="btn-cancel">Cancel</button>
                <button type="submit" [disabled]="appointmentForm.invalid || isSubmitting()" class="btn-primary">
                  {{ isSubmitting() ? 'Scheduling...' : 'Confirm Appointment' }}
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
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    h1 { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    p { color: #64748b; margin: 0; }
    .btn-primary {
      background: #0284c7;
      color: white;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      border: none;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:hover { background: #0369a1; }
    .content-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .filter-buttons { display: flex; gap: 0.5rem; }
    .filter-btn {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 0.4rem 0.85rem;
      border-radius: 0.375rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }
    .filter-btn.active {
      background: #0f172a;
      color: white;
      border-color: #0f172a;
    }
    .count-badge { font-size: 0.8rem; color: #64748b; font-weight: 600; }
    .table-container { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; text-align: left; }
    .data-table th { background: #f8fafc; color: #64748b; font-weight: 600; padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 0.85rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .font-semibold { font-weight: 600; }
    .text-muted { color: #94a3b8; }
    .text-xs { font-size: 0.75rem; }
    .status-pill {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .status-pill.scheduled { background: #e0f2fe; color: #0284c7; }
    .status-pill.completed { background: #dcfce7; color: #16a34a; }
    .status-pill.cancelled { background: #fee2e2; color: #dc2626; }

    .action-buttons { display: flex; gap: 0.5rem; }
    .btn-action {
      border: none;
      padding: 0.35rem 0.65rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action.complete { background: #dcfce7; color: #166534; }
    .btn-action.complete:hover { background: #bbf7d0; }
    .btn-action.cancel { background: #fee2e2; color: #991b1b; }
    .btn-action.cancel:hover { background: #fecaca; }

    .loading-box, .empty-box { padding: 3rem; text-align: center; color: #64748b; }
    .alert { padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
    .alert.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }
    .modal-card {
      background: white;
      border-radius: 0.75rem;
      width: 100%;
      max-width: 520px;
      padding: 1.75rem;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .modal-header h3 { font-size: 1.25rem; font-weight: 700; margin: 0; }
    .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
    .modal-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: #475569; }
    .form-group input, .form-group select, .form-group textarea {
      padding: 0.65rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      outline: none;
    }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
    .btn-cancel {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      color: #475569;
    }
  `]
})
export class AppointmentsComponent implements OnInit {
  private clinicalService = inject(ClinicalServicePort);
  private fb = inject(FormBuilder);

  appointments = signal<Appointment[]>([]);
  filteredAppointments = signal<Appointment[]>([]);
  patients = signal<Patient[]>([]);
  doctors = signal<Doctor[]>([]);

  isLoading = signal(true);
  isSubmitting = signal(false);
  showModal = signal(false);
  currentFilter = signal<'All' | 'Scheduled' | 'Completed' | 'Cancelled'>('All');

  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  appointmentForm = this.fb.group({
    patientId: ['', Validators.required],
    doctorId: ['', Validators.required],
    appointmentDate: ['', Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      appointments: this.clinicalService.getAppointments(),
      patients: this.clinicalService.getPatients(),
      doctors: this.clinicalService.getDoctors()
    }).subscribe({
      next: res => {
        const appts = res.appointments.data || [];
        this.appointments.set(appts);
        this.applyFilter(this.currentFilter(), appts);
        this.patients.set(res.patients.data || []);
        this.doctors.set(res.doctors.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.showAlert('Failed to load appointments.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  setFilter(filter: 'All' | 'Scheduled' | 'Completed' | 'Cancelled'): void {
    this.currentFilter.set(filter);
    this.applyFilter(filter, this.appointments());
  }

  private applyFilter(filter: string, list: Appointment[]): void {
    if (filter === 'All') {
      this.filteredAppointments.set(list);
    } else {
      this.filteredAppointments.set(list.filter(a => a.statusName === filter));
    }
  }

  openScheduleModal(): void {
    this.appointmentForm.reset({ patientId: '', doctorId: '', appointmentDate: '', notes: '' });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.appointmentForm.reset();
  }

  onSubmit(): void {
    if (this.appointmentForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.appointmentForm.value;
    const dto: CreateAppointmentDto = {
      patientId: Number(val.patientId),
      doctorId: Number(val.doctorId),
      appointmentDate: new Date(val.appointmentDate!).toISOString(),
      notes: val.notes || undefined
    };

    this.clinicalService.createAppointment(dto).subscribe({
      next: () => {
        this.showAlert('Appointment scheduled successfully.', 'success');
        this.closeModal();
        this.loadData();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.showAlert('Failed to schedule appointment.', 'error');
        this.isSubmitting.set(false);
      }
    });
  }

  complete(id: number): void {
    this.clinicalService.completeAppointment(id).subscribe({
      next: () => {
        this.showAlert('Appointment marked as Completed.', 'success');
        this.loadData();
      },
      error: () => this.showAlert('Failed to complete appointment.', 'error')
    });
  }

  cancel(id: number): void {
    this.clinicalService.cancelAppointment(id).subscribe({
      next: () => {
        this.showAlert('Appointment marked as Cancelled.', 'success');
        this.loadData();
      },
      error: () => this.showAlert('Failed to cancel appointment.', 'error')
    });
  }

  private showAlert(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 4000);
  }
}
