import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HospitalService } from '../../core/services/hospital.service';
import { Doctor } from '../../core/models/hospital.models';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Medical Specialists & Staff</h1>
          <p>Directory of licensed clinical doctors and medical specialists across hospital departments</p>
        </div>
      </div>

      @if (isLoading()) {
        <div class="loading-box">Loading medical staff directory...</div>
      } @else if (doctors().length === 0) {
        <div class="empty-box">No doctors found.</div>
      } @else {
        <div class="doctors-grid">
          @for (d of doctors(); track d.id) {
            <div class="doctor-card">
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
    h1 { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    p { color: #64748b; margin: 0; }
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
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .doctor-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 15px -3px rgba(0,0,0,0.08);
    }
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
  `]
})
export class DoctorsComponent implements OnInit {
  private hospitalService = inject(HospitalService);
  doctors = signal<Doctor[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.hospitalService.getDoctors().subscribe({
      next: (res: any) => {
        this.doctors.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
