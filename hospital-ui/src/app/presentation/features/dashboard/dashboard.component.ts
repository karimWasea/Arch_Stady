// ============================================================
// Presentation Layer — Dashboard Component
// Unified healthcare operational analytics & subsystem overview
// ============================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { AuthServicePort } from '../../../application/ports/auth.port';
import { ClinicalServicePort } from '../../../application/ports/clinical.port';
import { PharmacyServicePort } from '../../../application/ports/pharmacy.port';
import { LaboratoryServicePort } from '../../../application/ports/laboratory.port';
import { BillingServicePort } from '../../../application/ports/billing.port';
import { Appointment } from '../../../domain/models/clinical.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-page">
      <div class="header-section">
        <div>
          <h1>Hospital Operations Dashboard</h1>
          <p class="welcome-text">
            Welcome back, <strong>{{ authService.currentUser()?.fullName }}</strong>
            <span class="user-role-badge">[{{ authService.userRole() }}]</span>
          </p>
        </div>
        <div class="actions">
          <a routerLink="/appointments" class="btn-primary">+ Schedule Appointment</a>
          <a routerLink="/pharmacy/dispensing" class="btn-secondary">💊 Dispense Meds</a>
          <a routerLink="/laboratory/orders" class="btn-secondary">🔬 Order Lab Test</a>
          <a routerLink="/billing/invoices" class="btn-secondary">🧾 Create Invoice</a>
        </div>
      </div>

      <!-- Architecture Status Banner -->
      <div class="arch-banner">
        <div class="arch-tag">ONION ARCHITECTURE (STEP 3)</div>
        <div class="arch-info">
          <span>🎯 Domain Core (Pure Models)</span> &rarr;
          <span>⚡ Application Layer (Service Ports)</span> &rarr;
          <span>🔌 Infrastructure (HTTP Adapters & Cache)</span> &rarr;
          <span>🖥️ Presentation (Angular Standalone & Signals)</span>
        </div>
      </div>

      <!-- Subsystem KPIs Grid -->
      <div class="metrics-container">
        <!-- Clinical Subsystem KPIs -->
        <div class="subsystem-kpi-block">
          <h3 class="block-title">🩺 Clinical Subsystem</h3>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon blue">🧑‍🦱</div>
              <div class="metric-content">
                <span class="metric-title">Total Patients</span>
                <span class="metric-value">{{ patientCount() }}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon emerald">👨‍⚕️</div>
              <div class="metric-content">
                <span class="metric-title">Active Doctors</span>
                <span class="metric-value">{{ doctorCount() }}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon purple">📅</div>
              <div class="metric-content">
                <span class="metric-title">Appointments</span>
                <span class="metric-value">{{ appointments().length }}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon amber">🏢</div>
              <div class="metric-content">
                <span class="metric-title">Departments</span>
                <span class="metric-value">{{ departmentCount() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Secondary Subsystems KPIs -->
        <div class="subsystems-row">
          <!-- Pharmacy -->
          <div class="subsystem-card">
            <div class="subsystem-header">
              <span class="subsystem-icon">💊</span>
              <h4>Pharmacy Subsystem</h4>
            </div>
            <div class="mini-kpis">
              <div class="mini-kpi">
                <span class="label">Medicines</span>
                <span class="val">{{ medicineCount() }}</span>
              </div>
              <div class="mini-kpi alert-kpi">
                <span class="label">Low Stock Alerts</span>
                <span class="val" [class.danger]="lowStockCount() > 0">{{ lowStockCount() }}</span>
              </div>
            </div>
            <a routerLink="/pharmacy/stocks" class="subsystem-link">Manage inventory &rarr;</a>
          </div>

          <!-- Laboratory -->
          <div class="subsystem-card">
            <div class="subsystem-header">
              <span class="subsystem-icon">🔬</span>
              <h4>Laboratory Subsystem</h4>
            </div>
            <div class="mini-kpis">
              <div class="mini-kpi">
                <span class="label">Lab Tests</span>
                <span class="val">{{ labTestCount() }}</span>
              </div>
              <div class="mini-kpi">
                <span class="label">Lab Orders</span>
                <span class="val">{{ labOrderCount() }}</span>
              </div>
            </div>
            <a routerLink="/laboratory/orders" class="subsystem-link">Review orders &rarr;</a>
          </div>

          <!-- Billing -->
          <div class="subsystem-card">
            <div class="subsystem-header">
              <span class="subsystem-icon">💰</span>
              <h4>Billing & Invoices</h4>
            </div>
            <div class="mini-kpis">
              <div class="mini-kpi">
                <span class="label">Total Invoices</span>
                <span class="val">{{ invoiceCount() }}</span>
              </div>
              <div class="mini-kpi pending-kpi">
                <span class="label">Pending Claims</span>
                <span class="val">{{ pendingInvoiceCount() }}</span>
              </div>
            </div>
            <a routerLink="/billing/invoices" class="subsystem-link">Financial center &rarr;</a>
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
          <div class="loading-state">Loading dashboard data from subsystems...</div>
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
                    <td class="font-mono">#{{ item.id }}</td>
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
      max-width: 1240px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    h1 { font-size: 1.85rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    .welcome-text { color: #64748b; font-size: 0.95rem; margin: 0; }
    .user-role-badge { color: #0284c7; font-weight: 600; margin-left: 0.25rem; }
    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-primary {
      background: #0284c7;
      color: white;
      padding: 0.6rem 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.875rem;
      transition: background 0.2s;
    }
    .btn-primary:hover { background: #0369a1; }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 0.6rem 0.85rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.15s;
    }
    .btn-secondary:hover { background: #e2e8f0; }

    /* Arch banner */
    .arch-banner {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      color: #f1f5f9;
    }
    .arch-tag {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .arch-info {
      font-size: 0.8rem;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    /* Metrics */
    .metrics-container { display: flex; flex-direction: column; gap: 1.25rem; }
    .subsystem-kpi-block {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .block-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 1rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.6rem;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .metric-icon {
      width: 44px;
      height: 44px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }
    .metric-icon.blue { background: #e0f2fe; }
    .metric-icon.emerald { background: #dcfce7; }
    .metric-icon.purple { background: #f3e8ff; }
    .metric-icon.amber { background: #fef3c7; }
    .metric-content { display: flex; flex-direction: column; }
    .metric-title { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .metric-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; line-height: 1.2; }

    /* Subsystems row */
    .subsystems-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .subsystem-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .subsystem-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .subsystem-icon { font-size: 1.25rem; }
    .subsystem-header h4 { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0; }
    .mini-kpis {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .mini-kpi {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 0.6rem 0.75rem;
      display: flex;
      flex-direction: column;
    }
    .mini-kpi .label { font-size: 0.7rem; color: #64748b; font-weight: 600; }
    .mini-kpi .val { font-size: 1.25rem; font-weight: 700; color: #0f172a; }
    .mini-kpi .val.danger { color: #dc2626; }
    .subsystem-link {
      font-size: 0.8rem;
      font-weight: 600;
      color: #0284c7;
      text-decoration: none;
      margin-top: auto;
    }
    .subsystem-link:hover { text-decoration: underline; }

    /* Content Card */
    .content-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    .card-header {
      padding: 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-header h2 { font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0; }
    .link-more { color: #0284c7; font-size: 0.85rem; font-weight: 600; text-decoration: none; }
    .table-container { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; text-align: left; }
    .data-table th { background: #f8fafc; color: #64748b; font-weight: 600; padding: 0.75rem 1.25rem; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 0.85rem 1.25rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .font-mono { font-family: monospace; color: #64748b; }
    .font-medium { font-weight: 600; }
    .text-muted { color: #94a3b8; }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .status-badge.scheduled { background: #e0f2fe; color: #0284c7; }
    .status-badge.completed { background: #dcfce7; color: #16a34a; }
    .status-badge.cancelled { background: #fee2e2; color: #dc2626; }
    .loading-state, .empty-state { padding: 3rem; text-align: center; color: #64748b; font-size: 0.9rem; }
  `]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthServicePort);
  private clinicalService = inject(ClinicalServicePort);
  private pharmacyService = inject(PharmacyServicePort);
  private laboratoryService = inject(LaboratoryServicePort);
  private billingService = inject(BillingServicePort);

  patientCount = signal(0);
  doctorCount = signal(0);
  departmentCount = signal(0);
  appointments = signal<Appointment[]>([]);

  medicineCount = signal(0);
  lowStockCount = signal(0);
  labTestCount = signal(0);
  labOrderCount = signal(0);
  invoiceCount = signal(0);
  pendingInvoiceCount = signal(0);

  isLoading = signal(true);

  ngOnInit(): void {
    this.loadAllDashboardData();
  }

  loadAllDashboardData(): void {
    this.isLoading.set(true);

    forkJoin({
      patients: this.clinicalService.getPatients().pipe(catchError(() => of({ success: false, data: [] }))),
      doctors: this.clinicalService.getDoctors().pipe(catchError(() => of({ success: false, data: [] }))),
      departments: this.clinicalService.getDepartments().pipe(catchError(() => of({ success: false, data: [] }))),
      appointments: this.clinicalService.getAppointments().pipe(catchError(() => of({ success: false, data: [] }))),
      medicines: this.pharmacyService.getMedicines().pipe(catchError(() => of({ success: false, data: [] }))),
      stocks: this.pharmacyService.getStocks().pipe(catchError(() => of({ success: false, data: [] }))),
      labTests: this.laboratoryService.getLabTests().pipe(catchError(() => of({ success: false, data: [] }))),
      labOrders: this.laboratoryService.getLabOrders().pipe(catchError(() => of({ success: false, data: [] }))),
      invoices: this.billingService.getInvoices().pipe(catchError(() => of({ success: false, data: [] })))
    }).subscribe({
      next: res => {
        this.patientCount.set(res.patients.data?.length || 0);
        this.doctorCount.set(res.doctors.data?.length || 0);
        this.departmentCount.set(res.departments.data?.length || 0);
        this.appointments.set(res.appointments.data || []);

        this.medicineCount.set(res.medicines.data?.length || 0);
        const stocks = res.stocks.data || [];
        this.lowStockCount.set(stocks.filter(s => s.isLowStock || s.quantityInStock <= s.reorderLevel).length);

        this.labTestCount.set(res.labTests.data?.length || 0);
        this.labOrderCount.set(res.labOrders.data?.length || 0);

        const invoices = res.invoices.data || [];
        this.invoiceCount.set(invoices.length);
        this.pendingInvoiceCount.set(invoices.filter(i => i.statusName === 'Pending' || i.statusName === 'PartiallyPaid').length);

        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
