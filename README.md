# Hospital Management System — Step 1: Traditional Layered Architecture

An enterprise-grade reference implementation of a **Hospital Management System** built in **.NET 8 / C#** using **Traditional Layered Architecture**.

This project serves as **Step 1** of a 6-stage architectural study:
1. **Layered Architecture** (Current)
2. Hexagonal Architecture (Ports & Adapters)
3. Onion Architecture
4. Clean Architecture
5. Clean Architecture + Domain-Driven Design (DDD)
6. Modular Monolith

---

## 🏛️ 1. Architecture Overview

In this first step, the codebase follows the traditional **N-Tier / Layered Architecture** where technical concerns are segregated horizontally, and dependencies flow strictly **top-to-bottom**:

```
HospitalManagement.API (Presentation / HTTP / Swagger)
         ↓
HospitalManagement.Business (Services, Rules, DTOs, Validators)
         ↓
HospitalManagement.DataAccess (ApplicationDbContext, EF Core Configurations, Seeds)
         ↓
HospitalManagement.Entities (Core POCOs, Enums - Zero dependencies)
```

### Project Structure & Layer Responsibilities

```
D:\Arch_Stady\
│
├── HospitalManagement.slnx
├── .gitignore
├── README.md
│
├── HospitalManagement.Entities/       # Common POCOs and Domain Enums
│   ├── Appointment.cs
│   ├── AppointmentStatus.cs
│   ├── Department.cs
│   ├── Doctor.cs
│   ├── MedicalRecord.cs
│   ├── Patient.cs
│   ├── Prescription.cs
│   └── PrescriptionItem.cs
│
├── HospitalManagement.DataAccess/     # EF Core & SQL Server Persistence
│   ├── Context/
│   │   └── ApplicationDbContext.cs
│   ├── Configurations/                # Fluent API mappings
│   │   ├── AppointmentConfiguration.cs
│   │   ├── DepartmentConfiguration.cs
│   │   ├── DoctorConfiguration.cs
│   │   ├── MedicalRecordConfiguration.cs
│   │   ├── PatientConfiguration.cs
│   │   ├── PrescriptionConfiguration.cs
│   │   └── PrescriptionItemConfiguration.cs
│   └── Data/
│       └── DbInitializer.cs           # Initial Seed Data
│
├── HospitalManagement.Business/       # Application & Business Logic
│   ├── DTOs/                          # Request & Response Contracts
│   ├── Exceptions/                    # Domain-specific Exceptions
│   ├── Interfaces/                    # Service Contracts (IPatientService, etc.)
│   ├── Services/                      # Direct DbContext business implementations
│   └── Validators/                    # FluentValidation rules
│
├── HospitalManagement.API/            # Presentation & HTTP Host
│   ├── Controllers/                   # REST Controllers
│   ├── Middleware/                    # Global Exception Handler
│   ├── Program.cs                     # DI & Pipeline Configuration
│   └── appsettings.json               # SQL Server Connection String
│
└── HospitalManagement.Tests/          # Unit Testing Suite (xUnit + InMemory)
    └── BusinessServicesTests.cs       # 12 automated unit tests
```

---

## 🔌 2. REST API Endpoints

All endpoints return a uniform envelope:
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... }
}
```

| Domain | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Patients** | `GET` | `/api/patients` | List all patients |
| | `GET` | `/api/patients/{id}` | Get patient by ID |
| | `POST` | `/api/patients` | Register a new patient |
| | `PUT` | `/api/patients/{id}` | Update patient details |
| | `DELETE` | `/api/patients/{id}` | Remove patient (prevents delete if appointments exist) |
| **Doctors** | `GET` | `/api/doctors` | List all doctors |
| | `GET` | `/api/doctors/{id}` | Get doctor by ID |
| | `POST` | `/api/doctors` | Add doctor (validates department exists) |
| | `PUT` | `/api/doctors/{id}` | Update doctor details |
| | `DELETE` | `/api/doctors/{id}` | Delete doctor |
| **Departments** | `GET` | `/api/departments` | List hospital departments |
| | `GET` | `/api/departments/{id}` | Get department details |
| | `POST` | `/api/departments` | Create department |
| | `PUT` | `/api/departments/{id}` | Update department |
| | `DELETE` | `/api/departments/{id}` | Delete department (prevents delete if doctors assigned) |
| **Appointments**| `GET` | `/api/appointments` | List all appointments |
| | `GET` | `/api/appointments/{id}` | Get appointment details |
| | `POST` | `/api/appointments` | Schedule appointment (double-booking checks) |
| | `PUT` | `/api/appointments/{id}` | Update appointment slot |
| | `POST` | `/api/appointments/{id}/complete` | Mark appointment completed |
| | `POST` | `/api/appointments/{id}/cancel` | Cancel appointment |
| | `DELETE` | `/api/appointments/{id}` | Delete appointment record |
| **Medical Records**| `GET` | `/api/medical-records` | List medical history |
| | `GET` | `/api/medical-records/{id}` | Get specific medical record |
| | `POST` | `/api/medical-records` | Create record (validates patient, doctor, appointment) |
| | `PUT` | `/api/medical-records/{id}` | Update diagnosis / treatment |
| | `DELETE` | `/api/medical-records/{id}` | Delete record |
| **Prescriptions**| `GET` | `/api/prescriptions` | List prescriptions |
| | `GET` | `/api/prescriptions/{id}` | Get prescription with medication items |
| | `POST` | `/api/prescriptions` | Create prescription (requires $\ge 1$ medication item) |
| | `PUT` | `/api/prescriptions/{id}` | Update prescription and items |
| | `DELETE` | `/api/prescriptions/{id}` | Delete prescription |

---

## ⚖️ 3. Business Rules Enforced

1. **Double-booking Prevention**:
   - A Doctor cannot have two active appointments at the exact same time.
   - A Patient cannot have two active appointments at the exact same time.
2. **State Transition Rules**:
   - Cancelled appointments can never be completed.
   - Only Scheduled appointments can be marked as completed.
3. **Foreign Integrity in Business Layer**:
   - A Doctor must belong to an existing Department.
   - A Medical Record must reference an existing Patient and Doctor.
   - A Prescription must contain at least one `PrescriptionItem`.
4. **Relational Protection**:
   - Patients or Doctors with existing appointment histories cannot be deleted without resolution.

---

## 🔐 2. Authentication & Authorization

The system implements **JWT Bearer Authentication** and **Role-Based Access Control**:
- **Roles**: `Admin`, `Doctor`, `Staff`
- **Security**: Salted HMAC-SHA512 password hashing & signed JWT tokens.
- **Default Credentials**:
  - Admin: `admin` or `admin@hospital.org` / `Admin123!`
  - Doctor: `dr.jenkins` or `s.jenkins@hospital.org` / `Doctor123!`

### Auth Endpoints:
- `POST /api/auth/login` (Public)
- `POST /api/auth/register` (Public)
- `GET /api/auth/me` (`[Authorize]`)

Protected endpoints (`/api/patients`, `/api/doctors`, `/api/appointments`, `/api/prescriptions`) require the `Authorization: Bearer <token>` header.

---

## 💻 3. Angular SPA Frontend (`hospital-ui`)

A standalone-component Angular application styled with modern CSS:
- **Auth Guard**: Protects `/dashboard`, `/patients`, `/doctors`, and `/appointments`.
- **JWT Interceptor**: Automatically attaches Bearer token to all outbound requests and handles 401 expiration.
- **Demo Quick-Login**: Single-click buttons for Admin and Doctor roles.
- **Features**:
  - **Dashboard**: KPI metric cards and upcoming appointments.
  - **Patients Directory**: Searchable patient table and registration modal.
  - **Doctors Directory**: Clinical specialists list with contact details.
  - **Appointments Manager**: Booking modal, filters, and Complete/Cancel action buttons.

---

## 🧪 4. Running the Tests

Execute the xUnit test suite from the repository root:

```bash
dotnet test
```

All 16 business and authentication unit tests pass in under 1 second without external database dependencies.

---

## 🚀 5. How to Run Locally

### Step 1: Start Backend Web API
```bash
cd HospitalManagement.API
dotnet run
```
API runs on `http://localhost:5087` and `https://localhost:7159` with Swagger UI at the root.

### Step 2: Start Angular Frontend
```bash
cd hospital-ui
npm install
npm start
```
Frontend opens at `http://localhost:4200` with hot reload. Sign in with `admin` / `Admin123!` or `dr.jenkins` / `Doctor123!`.
