import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HospitalService } from '../../core/services/hospital.service';
import { AuthService } from '../../core/services/auth.service';
import { Appointment, Department, Doctor, Patient } from '../../core/models/hospital.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-page">
      <div class="header-section">
        <div>
          <h1>Clinical Operations Dashboard</h1>
          <p class="welcome-text">Welcome back, <strong>{{ authService.currentUser()?.fullName }}</strong> ({{ authService.userRole() }})</p>
        </div>
        <div class="actions">
          <a routerLink="/appointments" class="btn-primary">+ Schedule Appointment</a>
          <a routerLink="/patients" class="btn-secondary">+ Add Patient</a>
        </div>
      </div>

      <!-- KPI Metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon blue">🧑‍🦱</div>
          <div class="metric-content">
            <span class="metric-title">Total Patients</span>
            <span class="metric-value">{{ patients().length }}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon emerald">👨‍⚕️</div>
          <div class="metric-content">
            <span class="metric-title">Active Doctors</span>
            <span class="metric-value">{{ doctors().length }}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon purple">📅</div>
          <div class="metric-content">
            <span class="metric-title">Total Appointments</span>
            <span class="metric-value">{{ appointments().length }}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon amber">🏥</div>
          <div class="metric-content">
            <span class="metric-title">Departments</span>
            <span class="metric-value">{{ departments().length }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Appointments -->
      <div class="content-card">
        <div class="card-header">
          <h2>Recent & Upcoming Appointments</h2>
          <a routerLink="/appointments" class="link-more">View all appointments &rarr;</a>
        </div>

        @if (isLoading()) {
          <div class="loading-state">Loading dashboard data from API...</div>
        } @else if (appointments().length === 0) {
          <div class="empty-state">No appointments recorded yet.</div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                @for (item of appointments().slice(0, 5); track item.id) {
                  <tr>
                    <td>#{{ item.id }}</td>
                    <td class="font-medium">{{ item.patientName }}</td>
                    <td>{{ item.doctorName }}</td>
                    <td>{{ item.appointmentDate | date:'medium' }}</td>
                    <td>
                      <span class="status-badge" [ngClass]="item.statusName.toLowerCase()">
                        {{ item.statusName }}
                      </span>
                    </td>
                    <td class="text-muted">{{ item.notes || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem;
    }
    .welcome-text {
      color: #64748b;
      margin: 0;
      font-size: 0.95rem;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
    }
    .btn-primary {
      background: #0284c7;
      color: white;
      padding: 0.65rem 1.15rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn-primary:hover { background: #0369a1; }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 0.65rem 1.15rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-secondary:hover { background: #e2e8f0; }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
    }
    .metric-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .metric-icon {
      width: 48px;
      height: 48px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .metric-icon.blue { background: #e0f2fe; }
    .metric-icon.emerald { background: #dcfce7; }
    .metric-icon.purple { background: #f3e8ff; }
    .metric-icon.amber { background: #fef3c7; }

    .metric-content {
      display: flex;
      flex-direction: column;
    }
    .metric-title {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      font-weight: 600;
    }
    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }

    .content-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .card-header h2 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    .link-more {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0284c7;
      text-decoration: none;
    }
    .link-more:hover { text-decoration: underline; }

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
      color: #64748b;
      font-weight: 600;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .font-medium { font-weight: 600; }
    .text-muted { color: #94a3b8; }

    .status-badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
    }
    .status-badge.scheduled { background: #e0f2fe; color: #0369a1; }
    .status-badge.completed { background: #dcfce7; color: #15803d; }
    .status-badge.cancelled { background: #fee2e2; color: #b91c1c; }

    .loading-state, .empty-state {
      padding: 2rem;
      text-align: center;
      color: #64748b;
    }
  `]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private hospitalService = inject(HospitalService);

  patients = signal<Patient[]>([]);
  doctors = signal<Doctor[]>([]);
  appointments = signal<Appointment[]>([]);
  departments = signal<Department[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    forkJoin({
      patients: this.hospitalService.getPatients(),
      doctors: this.hospitalService.getDoctors(),
      appointments: this.hospitalService.getAppointments(),
      departments: this.hospitalService.getDepartments()
    }).subscribe({
      next: (res) => {
        this.patients.set(res.patients.data || []);
        this.doctors.set(res.doctors.data || []);
        this.appointments.set(res.appointments.data || []);
        this.departments.set(res.departments.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}
