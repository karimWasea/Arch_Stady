// ============================================================
// Presentation Layer — Sidebar Component
// Navigation organized by architectural subsystems
// ============================================================

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavGroup {
  title: string;
  icon: string;
  items: { label: string; route: string; icon: string }[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="app-sidebar">
      <div class="sidebar-scroll">
        @for (group of navGroups; track group.title) {
          <div class="nav-section">
            <div class="section-title">
              <span class="section-icon">{{ group.icon }}</span>
              <span>{{ group.title }}</span>
            </div>
            <ul class="nav-list">
              @for (item of group.items; track item.route) {
                <li>
                  <a
                    [routerLink]="item.route"
                    routerLinkActive="active"
                    class="sidebar-link"
                  >
                    <span class="item-icon">{{ item.icon }}</span>
                    <span class="item-label">{{ item.label }}</span>
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    .app-sidebar {
      width: 250px;
      min-width: 250px;
      background: #1e293b;
      border-right: 1px solid #334155;
      color: #94a3b8;
      height: calc(100vh - 60px);
      position: sticky;
      top: 60px;
      display: flex;
      flex-direction: column;
    }
    .sidebar-scroll {
      padding: 1.25rem 0.85rem;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .sidebar-scroll::-webkit-scrollbar {
      width: 4px;
    }
    .sidebar-scroll::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .section-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      padding: 0.25rem 0.6rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-icon {
      font-size: 0.85rem;
    }
    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .sidebar-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.55rem 0.75rem;
      border-radius: 0.5rem;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .sidebar-link:hover {
      background: #334155;
      color: #f8fafc;
      transform: translateX(2px);
    }
    .sidebar-link.active {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      font-weight: 600;
      border-left: 3px solid #38bdf8;
      padding-left: calc(0.75rem - 3px);
    }
    .item-icon {
      font-size: 1rem;
      width: 1.25rem;
      text-align: center;
    }
    .item-label {
      flex: 1;
    }
  `]
})
export class SidebarComponent {
  navGroups: NavGroup[] = [
    {
      title: 'Clinical Subsystem',
      icon: '🩺',
      items: [
        { label: 'Dashboard', route: '/dashboard', icon: '📊' },
        { label: 'Patients', route: '/patients', icon: '👥' },
        { label: 'Doctors', route: '/doctors', icon: '👨‍⚕️' },
        { label: 'Departments', route: '/departments', icon: '🏢' },
        { label: 'Appointments', route: '/appointments', icon: '📅' },
        { label: 'Medical Records', route: '/medical-records', icon: '📋' },
        { label: 'Prescriptions', route: '/prescriptions', icon: '💊' }
      ]
    },
    {
      title: 'Pharmacy Subsystem',
      icon: '💊',
      items: [
        { label: 'Medicines', route: '/pharmacy/medicines', icon: '💊' },
        { label: 'Stock Inventory', route: '/pharmacy/stocks', icon: '📦' },
        { label: 'Dispensing Orders', route: '/pharmacy/dispensing', icon: '🛒' }
      ]
    },
    {
      title: 'Laboratory Subsystem',
      icon: '🔬',
      items: [
        { label: 'Lab Tests Catalog', route: '/laboratory/tests', icon: '🔬' },
        { label: 'Lab Orders', route: '/laboratory/orders', icon: '🧪' },
        { label: 'Test Results', route: '/laboratory/results', icon: '📑' }
      ]
    },
    {
      title: 'Billing Subsystem',
      icon: '💰',
      items: [
        { label: 'Insurance Policies', route: '/billing/insurance', icon: '🛡️' },
        { label: 'Invoices', route: '/billing/invoices', icon: '🧾' },
        { label: 'Payments', route: '/billing/payments', icon: '💳' }
      ]
    }
  ];
}
