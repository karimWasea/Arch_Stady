# Step 2: Hexagonal Architecture (Ports & Adapters) Guide

## 1. Architectural Philosophy & Context

In **Step 1**, we built the Hospital Management System using **Traditional Layered Architecture**:
```
[ UI / Presentation ] -> [ Business Logic Layer ] -> [ Data Access Layer (EF Core) ] -> [ Database ]
```
In Layered Architecture, the entire system is built top-down, with high-level business policies directly depending on low-level database frameworks (`ApplicationDbContext`).

In **Step 2**, we evolved the SAME project into **Hexagonal Architecture** (also known as **Ports & Adapters**, invented by Dr. Alistair Cockburn).

### The Core Principle
> **"Allow an application to equally be driven by users, programs, automated test, or batch scripts, and to be developed and tested in isolation from its eventual run-time devices and databases."** — Alistair Cockburn

---

## 2. Hexagonal Architecture Blueprint

```
                                      +---------------------------------------------+
                                      |         PRIMARY / DRIVING ADAPTERS          |
                                      |  - ASP.NET Core API Controllers             |
                                      |  - Automated Test Suites                    |
                                      |  - Swagger UI / HTTP Clients                |
                                      +---------------------------------------------+
                                                             |
                                                             | calls Inbound Ports
                                                             v
                             =================================================================
                            ||              THE HEXAGON (HospitalManagement.Core)            ||
                            ||                                                               ||
                            ||  [ DRIVING / INBOUND PORTS ]                                  ||
                            ||  - IAppointmentUseCases     - IPatientUseCases                ||
                            ||  - IDoctorUseCases          - IDepartmentUseCases             ||
                            ||  - IMedicalRecordUseCases   - IPrescriptionUseCases           ||
                            ||  - IAuthUseCases                                              ||
                            ||                                                               ||
                            ||               v (implemented by)                              ||
                            ||                                                               ||
                            ||  [ CORE USE CASES & DOMAIN LOGIC ]                            ||
                            ||  - AppointmentUseCases (conflict rules, notification flow)    ||
                            ||  - DoctorUseCases (cache-aside orchestration)                 ||
                            ||  - Pure Entities: Patient, Doctor, Appointment, User          ||
                            ||  - DTOs, Security, Validators, Exceptions                     ||
                            ||                                                               ||
                            ||               v (depends on)                                  ||
                            ||                                                               ||
                            ||  [ DRIVEN / OUTBOUND PORTS (SPI) ]                            ||
                            ||  - IAppointmentRepository    - IPatientRepository             ||
                            ||  - IDoctorRepository         - IDepartmentRepository          ||
                            ||  - IMedicalRecordRepository  - IPrescriptionRepository        ||
                            ||  - IUserRepository           - ICachePort (Redis)             ||
                            ||  - INotificationPort (Email)                                  ||
                            ||                                                               ||
                             =================================================================
                                      |                      |                      |
                    implements Outbound Ports                |                      |
                                      v                      v                      v
                   +----------------------+  +---------------------+  +---------------------+
                   |   DRIVEN ADAPTER 1   |  |   DRIVEN ADAPTER 2  |  |   DRIVEN ADAPTER 3  |
                   |     Persistence      |  |     Redis Cache     |  | Email Notifications|
                   |      (EF Core)       |  | (StackExchange.Redis|  |   (SMTP + Preview)  |
                   +----------------------+  +---------------------+  +---------------------+
```

---

## 3. Key Concepts Explained

### 1. The Hexagon (Inside)
The Hexagon represents the inside world:
- **`HospitalManagement.Core`**:
  - Contains all business rules, domain entities, use cases, and DTOs.
  - **Zero external infrastructure dependencies**: No EF Core, no SQL Server, no Redis, no MailKit, no ASP.NET Core MVC.
  - Can be tested 100% in memory with mock ports in milliseconds!

### 2. Ports (Inside the Hexagon)
Ports are plain C# interfaces declared **inside** the Core:
- **Driving (Inbound) Ports**: What the outside world can do with our application (`IAppointmentUseCases`, `IDoctorUseCases`, `IAuthUseCases`).
- **Driven (Outbound) Ports**: What our application needs from the outside world (`IAppointmentRepository`, `ICachePort`, `INotificationPort`).

### 3. Adapters (Outside the Hexagon)
Adapters are technical plugins that bridge the outside world with the inside:
- **Driving Adapters**:
  - `HospitalManagement.API` (Controllers): Receives HTTP JSON, calls Inbound Ports, returns HTTP 200/201/400.
  - `HospitalManagement.Tests`: Invokes use cases to verify business rules.
- **Driven Adapters**:
  - `HospitalManagement.Adapters.Persistence`: Implements repository ports using EF Core `ApplicationDbContext` and SQL Server.
  - `HospitalManagement.Adapters.Caching.Redis`: Implements `ICachePort` using `StackExchange.Redis` with resilient in-memory fallback.
  - `HospitalManagement.Adapters.Notifications.Email`: Implements `INotificationPort` with rich HTML templates and development logging.

---

## 4. How Redis & Email are Integrated into the Hexagon

### A. Redis Caching Port & Cache-Aside Pattern
1. In `HospitalManagement.Core.Ports.Outbound.Caching.ICachePort`:
   ```csharp
   public interface ICachePort
   {
       Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
       Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken ct = default);
       Task RemoveAsync(string key, CancellationToken ct = default);
       Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default);
   }
   ```
2. In `DoctorUseCases.cs` (Cache-Aside):
   - First checks `_cachePort.GetAsync<IEnumerable<DoctorDto>>("doctors:all")`.
   - On cache miss: queries `IDoctorRepository`, stores in Redis with 10 min TTL.
   - On doctor create/update: calls `_cachePort.RemoveByPrefixAsync("doctors:")`.

### B. Email Notification Port & Event Dispatch
1. In `HospitalManagement.Core.Ports.Outbound.Notifications.INotificationPort`:
   ```csharp
   public interface INotificationPort
   {
       Task SendAppointmentBookedAsync(AppointmentNotificationDto notification, CancellationToken ct = default);
       Task SendAppointmentCancelledAsync(AppointmentNotificationDto notification, CancellationToken ct = default);
       Task SendAppointmentRescheduledAsync(AppointmentNotificationDto notification, DateTime oldDate, CancellationToken ct = default);
   }
   ```
2. In `AppointmentUseCases.cs`:
   - Enforces domain rules (no doctor conflict, no patient conflict).
   - Persists appointment through `IAppointmentRepository`.
   - Evicts Redis cache through `ICachePort`.
   - Dispatches confirmation email through `INotificationPort`.

---

## 5. Summary of Projects in Solution

| Project Name | Hexagonal Role | Purpose |
| :--- | :--- | :--- |
| `HospitalManagement.Core` | **The Hexagon** | Pure business use cases, domain entities, inbound & outbound ports. |
| `HospitalManagement.API` | **Driving Adapter** | ASP.NET Core REST API controllers, Swagger, DI Composition Root. |
| `HospitalManagement.Adapters.Persistence` | **Driven Adapter** | EF Core 8, SQL Server migrations, repository implementations. |
| `HospitalManagement.Adapters.Caching.Redis` | **Driven Adapter** | StackExchange.Redis caching with circuit-breaker memory fallback. |
| `HospitalManagement.Adapters.Notifications.Email` | **Driven Adapter** | SMTP email dispatch with responsive HTML & console preview cards. |
| `HospitalManagement.Tests` | **Driving Adapter** | 12 automated unit tests verifying core use cases and adapters. |
| `hospital-ui` | **Client Application** | Angular 22 standalone UI consuming the Driving API adapter. |
