// ============================================================
// Application Layer — Auth Service Port
// Abstract contract — no implementation details
// ============================================================

import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { User, AuthResponse, LoginRequest, RegisterRequest, ApiResponse } from '../../domain/models/auth.models';

export abstract class AuthServicePort {
  abstract currentUser: Signal<User | null>;
  abstract token: Signal<string | null>;
  abstract isAuthenticated: Signal<boolean>;
  abstract userRole: Signal<string | null>;

  abstract login(request: LoginRequest): Observable<ApiResponse<AuthResponse>>;
  abstract register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>>;
  abstract logout(): void;
}
