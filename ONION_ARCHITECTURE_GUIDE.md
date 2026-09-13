# Onion Architecture Guide (Step 3) - Hospital Management System

## 1. Overview & Architecture Rings

This system has evolved to **Onion Architecture** based on **Jeffrey Palermo's concentric rings pattern**. The fundamental rule of Onion Architecture is that **all dependencies point strictly inward toward the core domain**. 

The Domain layer sits at the very center, completely isolated from databases, UI frameworks, caching, and network protocols.

```
┌─────────────────────────────────────────────────────────────┐
│                      Infrastructure                         │
│   (EF Core 8, SQL Server, StackExchange.Redis, SMTP Email)  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │               Presentation / API                    │   │
│   │          (ASP.NET Core Web API, Swagger)            │   │
│   │                                                     │   │
│   │   ┌─────────────────────────────────────────────┐   │   │
│   │   │                 Application                 │   │   │
│   │   │   (Use Cases, Application Services, DTOs,   │   │   │
│   │   │    Repository Interfaces, Cache/Email Ports)│   │   │
│   │   │                                             │   │   │
│   │   │   ┌─────────────────────────────────────┐   │   │   │
│   │   │   │               Domain                │   │   │   │
│   │   │   │    (Entities, Enums, Exceptions)    │   │   │   │
│   │   │   │   * 0 external library references * │   │   │   │
│   │   │   └─────────────────────────────────────┘   │   │   │
│   │   └─────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Layer Responsibilities & Dependency Graph

### 1. `HospitalManagement.Domain` (Core Inner Ring)
- **External Dependencies**: **NONE** (No EF Core, no Web, no JSON libraries).
- **Contents**:
  - `Entities/Clinical`: `Patient`, `Doctor`, `Department`, `Appointment`, `MedicalRecord`, `Prescription`, `PrescriptionItem`, `User`.
  - `Entities/Pharmacy`: `Medicine`, `Stock`, `DispensingOrder`, `DispensingOrderItem`.
  - `Entities/Laboratory`: `LabTest`, `LabOrder`, `LabOrderItem`, `LabResult`.
  - `Entities/Billing`: `Insurance`, `Invoice`, `InvoiceItem`, `Payment`.
  - `Enums`: `AppointmentStatus`, `UserRole`, `DosageForm`, `DispensingStatus`, `LabPriority`, `LabOrderStatus`, `InvoiceStatus`, `PaymentMethod`.
  - `Exceptions`: `DomainException`, `NotFoundException`, `ConflictException`, `BusinessRuleException`.

### 2. `HospitalManagement.Application` (Middle Ring)
- **Dependencies**: Depends **ONLY** on `HospitalManagement.Domain`.
- **Contents**:
  - **Interfaces**:
    - Repositories: `IAppointmentRepository`, `IPatientRepository`, `IDoctorRepository`, `IDepartmentRepository`, `IMedicalRecordRepository`, `IPrescriptionRepository`, `IUserRepository`, `IMedicineRepository`, `IStockRepository`, `IDispensingRepository`, `ILabTestRepository`, `ILabOrderRepository`, `ILabResultRepository`, `IInvoiceRepository`, `IPaymentRepository`, `IInsuranceRepository`.
    - Unit of Work: `IUnitOfWork`.
    - Infrastructure Interfaces: `ICacheService`, `IEmailService`.
  - **Services**:
    - Clinical: `AppointmentService`, `PatientService`, `DoctorService`, `DepartmentService`, `MedicalRecordService`, `PrescriptionService`, `AuthService`.
    - Pharmacy: `PharmacyService` (stock deduction, batch verification, dispensing).
    - Laboratory: `LaboratoryService` (order lifecycle, abnormal test detection, automated alert dispatch).
    - Billing: `BillingService` (insurance coverage math, invoice generation, payment tracking).
  - **Security**: `PasswordHasher` (HMACSHA512), `JwtTokenGenerator`.
  - **Validators**: FluentValidation rules for all incoming requests.

### 3. `HospitalManagement.Infrastructure` (Outer Ring - Technical Concerns)
- **Dependencies**: Depends on `HospitalManagement.Application` and `HospitalManagement.Domain`.
- **Contents**:
  - `ApplicationDbContext`: EF Core database context with 18 entity sets and fluent configurations.
  - `Repositories`: Implementations for all 16 repository interfaces.
  - `Caching`: `RedisCacheService` with automatic resilient in-memory fallback.
  - `Notifications`: `EmailService` supporting HTML templates and notification preview.
  - `Data/DbInitializer`: Seeds initial clinical departments, doctors, patients, medicines, stocks, lab tests, and insurance policies.

### 4. `HospitalManagement.API` (Outer Ring - Presentation & Composition Root)
- **Dependencies**: References `Application`, `Infrastructure`, and `Domain`.
- **Contents**:
  - Controllers:
    - Clinical: `AuthController`, `AppointmentsController`, `PatientsController`, `DoctorsController`, `DepartmentsController`, `MedicalRecordsController`, `PrescriptionsController`.
    - Pharmacy: `PharmacyController` (`/api/pharmacy/medicines`, `/api/pharmacy/stocks`, `/api/pharmacy/dispense`).
    - Laboratory: `LaboratoryController` (`/api/laboratory/tests`, `/api/laboratory/orders`, `/api/laboratory/results`).
    - Billing: `BillingController` (`/api/billing/insurance`, `/api/billing/invoices`, `/api/billing/payments`).
  - Middleware: `ExceptionHandlingMiddleware` mapping domain exceptions to RFC 7807 JSON responses.

---

## 3. Subsystem Deep Dive

### 💊 1. Pharmacy Subsystem
- **Medicine Catalog**: Manages pharmaceutical products, dosages (Tablet, Capsule, Syrup, Injection), SKUs, and pricing.
- **Stock Batch Tracking**: Multi-batch tracking with expiration dates, quantities, locations (`Shelf A1-03`), and reorder thresholds.
- **Dispensing Engine**:
  - Checks available non-expired stock across all batches.
  - Throws `BusinessRuleException` if requested quantity exceeds total stock.
  - Depletes stock using FIFO batch deduction.
  - Records immutable `DispensingOrder` and invalidates cache (`pharmacy:*`).

### 🧪 2. Laboratory Subsystem
- **Catalog**: Lab test definitions (`Complete Blood Count`, `Lipid Panel`, `Fasting Glucose`, `LFT`) with reference ranges and turnaround times.
- **Lab Orders**: Doctors prescribe one or more lab tests with priorities (`Routine`, `Urgent`, `Stat`).
- **Results & Abnormal Alerts**:
  - Lab technicians record findings and mark `IsAbnormal`.
  - If a result is abnormal, an automated high-priority email alert is dispatched to the patient and ordering physician.

### 💳 3. Billing & Insurance Subsystem
- **Insurance Coverage Engine**:
  - Looks up patient's active insurance policy.
  - Applies coverage percentage (e.g. 80%) up to the policy's `MaxCoverageAmount`.
  - Computes subtotal, tax, discount, insurance deduction, and final `BalanceDue`.
- **Payments & Receipts**:
  - Tracks payments with payment method (Cash, Credit Card, Bank Transfer, Insurance Claim).
  - Automatically reduces `BalanceDue`.
  - When balance reaches $0.00, automatically marks the invoice `Paid`.

---

## 4. Verification & Testing

The solution includes 18 unit tests covering all 4 rings and subsystems:
- `AppointmentServiceTests`: Doctor conflict detection, cache invalidation, email dispatch.
- `AuthUseCasesTests`: Password hashing validation, JWT claims generation.
- `DoctorUseCasesCacheTests`: Redis cache HIT vs MISS verification.
- `PharmacyServiceTests`: Stock deduction and out-of-stock validation.
- `LaboratoryServiceTests`: Order creation and abnormal result alerts.
- `BillingServiceTests`: Insurance coverage calculation and balance reduction.
- `PersistenceRepositoryTests`: InMemory EF Core repository operations.
- `RedisCacheServiceTests`: Resilient offline in-memory fallback.
- `EmailServiceTests`: Mocked email dispatch verification.

To run the complete test suite:
```bash
dotnet test D:\Arch_Stady\HospitalManagement.slnx
```
