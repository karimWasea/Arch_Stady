import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-circle">🏥</div>
          <h2>Hospital Management</h2>
          <p>Sign in to access patient records and clinical workflows</p>
        </div>

        @if (errorMessage()) {
          <div class="alert-error">
            <span class="icon">⚠️</span>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="usernameOrEmail">Username or Email</label>
            <input
              id="usernameOrEmail"
              type="text"
              formControlName="usernameOrEmail"
              placeholder="e.g. admin@hospital.org"
              [class.invalid]="isFieldInvalid('usernameOrEmail')"
            />
            @if (isFieldInvalid('usernameOrEmail')) {
              <small class="error-text">Username or email is required</small>
            }
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="••••••••"
              [class.invalid]="isFieldInvalid('password')"
            />
            @if (isFieldInvalid('password')) {
              <small class="error-text">Password is required</small>
            }
          </div>

          <button type="submit" [disabled]="loginForm.invalid || isLoading()" class="btn-submit">
            @if (isLoading()) {
              <span>Authenticating...</span>
            } @else {
              <span>Sign In</span>
            }
          </button>
        </form>

        <div class="demo-accounts">
          <span class="demo-title">Quick Demo Login</span>
          <div class="demo-buttons">
            <button (click)="fillDemo('admin', 'Admin123!')" type="button" class="btn-demo admin">
              <span>Admin</span>
              <small>admin / Admin123!</small>
            </button>
            <button (click)="fillDemo('dr.jenkins', 'Doctor123!')" type="button" class="btn-demo doctor">
              <span>Doctor</span>
              <small>dr.jenkins / Doctor123!</small>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 1.5rem;
    }
    .login-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 2.5rem;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .logo-circle {
      width: 56px;
      height: 56px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      margin: 0 auto 1rem;
    }
    .login-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 0.5rem;
    }
    .login-header p {
      font-size: 0.875rem;
      color: #94a3b8;
      margin: 0;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #cbd5e1;
    }
    .form-group input {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      color: #f8fafc;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-group input:focus {
      border-color: #38bdf8;
    }
    .form-group input.invalid {
      border-color: #ef4444;
    }
    .error-text {
      color: #f87171;
      font-size: 0.75rem;
    }
    .btn-submit {
      margin-top: 0.5rem;
      background: #0284c7;
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 0.85rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-submit:hover:not(:disabled) {
      background: #0369a1;
    }
    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .demo-accounts {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #334155;
    }
    .demo-title {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 0.75rem;
      text-align: center;
    }
    .demo-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .btn-demo {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 0.6rem 0.85rem;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }
    .btn-demo:hover {
      border-color: #38bdf8;
      background: #1e293b;
    }
    .btn-demo span {
      font-size: 0.85rem;
      font-weight: 600;
      color: #f1f5f9;
    }
    .btn-demo small {
      font-size: 0.7rem;
      color: #94a3b8;
      margin-top: 2px;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.group({
    usernameOrEmail: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  fillDemo(username: string, pass: string): void {
    this.loginForm.patchValue({
      usernameOrEmail: username,
      password: pass
    });
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const values = this.loginForm.value;
    this.authService.login({
      usernameOrEmail: values.usernameOrEmail!,
      password: values.password!
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Login failed. Please verify credentials.';
        this.errorMessage.set(msg);
      }
    });
  }
}
