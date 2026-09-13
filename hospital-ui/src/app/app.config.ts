// ============================================================
// Application Configuration — Dependency Injection Wiring
// Inversion of Control: Ports mapped to Infrastructure Adapters
// ============================================================

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './infrastructure/interceptors/auth.interceptor';

// Application Ports
import { AuthServicePort } from './application/ports/auth.port';
import { ClinicalServicePort } from './application/ports/clinical.port';
import { PharmacyServicePort } from './application/ports/pharmacy.port';
import { LaboratoryServicePort } from './application/ports/laboratory.port';
import { BillingServicePort } from './application/ports/billing.port';

// Infrastructure Adapters
import { AuthAdapter } from './infrastructure/adapters/auth.adapter';
import { ClinicalAdapter } from './infrastructure/adapters/clinical.adapter';
import { PharmacyAdapter } from './infrastructure/adapters/pharmacy.adapter';
import { LaboratoryAdapter } from './infrastructure/adapters/laboratory.adapter';
import { BillingAdapter } from './infrastructure/adapters/billing.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),

    // Onion Architecture: Dependency Inversion mappings
    { provide: AuthServicePort, useClass: AuthAdapter },
    { provide: ClinicalServicePort, useClass: ClinicalAdapter },
    { provide: PharmacyServicePort, useClass: PharmacyAdapter },
    { provide: LaboratoryServicePort, useClass: LaboratoryAdapter },
    { provide: BillingServicePort, useClass: BillingAdapter }
  ]
};
