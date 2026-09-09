# Architectural Deep Dive: Hospital Management System (Step 1 — Layered Architecture)

This guide documents the architecture, compile-time dependency graph, runtime business flow, design patterns, libraries, and testing strategy for the **Hospital Management System**.

---

## 1. Architectural Style: Traditional Layered Architecture (N-Tier)

Traditional Layered Architecture is an architectural style where components are organized into horizontal strata (layers), with each layer performing a specific role in the application lifecycle.

```
┌─────────────────────────────────────────────────────────────┐
│                 Angular SPA Frontend (hospital-ui)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────▼──────────────────────────────┐
│       Presentation Layer: HospitalManagement.API            │
│       (Controllers, JWT Authentication, Global Middleware)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Project Reference
┌──────────────────────────────▼──────────────────────────────┐
│       Business Logic Layer: HospitalManagement.Business     │
│       (Domain Services, Business Rules, FluentValidation)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Project Reference
┌──────────────────────────────▼──────────────────────────────┐
│       Data Access Layer: HospitalManagement.DataAccess       │
│       (ApplicationDbContext, Fluent API Mappings, Seeds)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Project Reference
┌──────────────────────────────▼──────────────────────────────┐
│       Entities Layer: HospitalManagement.Entities           │
│       (Pure Domain POCOs, Enums - Zero External References) │
└──────────────────────────────┬──────────────────────────────┘
                               │ Database Queries (T-SQL)
┌──────────────────────────────▼──────────────────────────────┐
│                 Database: Microsoft SQL Server               │
└─────────────────────────────────────────────────────────────┘
```

### The Fundamental Rule of Layered Architecture:
> **Dependencies flow strictly top-to-bottom.** Higher-level layers know about lower-level layers, but lower-level layers have zero knowledge of who calls them.

---

## 2. Dependencies: Compile-Time vs. Runtime Flow

A crucial architectural distinction exists between **static compile-time project references** and **dynamic runtime execution**:

### A. Compile-Time Project References (Static & Downward)

| Project | Allowed to Reference | Forbidden to Reference | Reason |
| :--- | :--- | :--- | :--- |
| **`HospitalManagement.Entities`** | *None (Pure C#)* | API, Business, DataAccess | Entities are the shared vocabulary of the system. |
| **`HospitalManagement.DataAccess`**| `Entities` | Business, API | Database mapping only depends on domain shapes, never on business rules. |
| **`HospitalManagement.Business`** | `DataAccess`, `Entities` | API | Business rules coordinate data persistence, but must remain independent of HTTP/Web concepts. |
| **`HospitalManagement.API`** | `Business`, `DataAccess`, `Entities` | *None* | The host application assembles dependencies and exposes them via HTTP. |

### B. Runtime Flow of Business (Dynamic & Bidirectional)

When an authorized user performs an operation (e.g., `POST /api/appointments`), the execution descends down the stack and ascends back up:

1. **Client Dispatches**: Angular component submits reactive form $\to$ `AuthInterceptor` attaches `Authorization: Bearer <jwt>` $\to$ HTTP POST request to API.
2. **API Ingress**: `ExceptionHandlingMiddleware` wraps request $\to$ `AppointmentsController` validates JWT claims & deserializes JSON into `CreateAppointmentDto`.
3. **Business Validation**: `AppointmentService` is invoked:
   - Validates existence of Doctor and Patient.
   - **Enforces Business Rule 1**: Ensures Doctor has no overlapping appointment at the requested timestamp.
   - **Enforces Business Rule 2**: Ensures Patient has no overlapping appointment at the requested timestamp.
4. **Data Access & Change Tracking**: `AppointmentService` maps DTO to `Appointment` entity $\to$ invokes `ApplicationDbContext.Appointments.Add()` $\to$ EF Core Change Tracker queues operation.
5. **Database Transaction**: `SaveChangesAsync()` opens connection to SQL Server $\to$ executes parameterized `INSERT` statement $\to$ commits transaction $\to$ receives generated database `Id`.
6. **Response Ascent**: Entity is mapped into an `AppointmentDto` $\to$ wrapped in an `ApiResponse<T>` envelope $\to$ Controller outputs `HTTP 201 Created` with `Location` header $\to$ Angular UI receives JSON and updates table reactively.

---

## 3. Design Patterns Applied

### 1. N-Tier / Layered Pattern (Architectural)
- **Where**: Entire solution project structure.
- **Why**: Enforces technical separation of concerns (SoC). Database migrations can change without affecting controller signatures, and HTTP transport changes without altering data queries.

### 2. Data Transfer Object (DTO) Pattern (Structural)
- **Where**: `HospitalManagement.Business.DTOs` (`CreatePatientDto`, `AppointmentDto`, `AuthResponseDto`, etc.).
- **Why**: Prevents **Over-Posting** and **Mass Assignment** vulnerabilities. EF Core navigation properties (which could cause infinite serialization loops) are never exposed directly to external HTTP clients.

### 3. Dependency Injection & Inversion of Control (IoC) (Creational)
- **Where**: Configured in `Program.cs` and injected into constructor parameters.
- **Why**: Decouples classes from object creation.
  - **Scoped**: `IPatientService`, `IAppointmentService`, `ApplicationDbContext` (one instance per HTTP request).
  - **Singleton**: `IPasswordHasher`, `IJwtTokenGenerator` (thread-safe, stateless utilities created once).

### 4. Repository & Unit of Work Pattern (DataAccess)
- **Where**: `ApplicationDbContext` and `DbSet<T>`.
- **Architectural Note**: In modern EF Core, `DbContext` **is** a Unit of Work, and `DbSet<T>` **is** a Repository. We intentionally avoided adding a redundant `IRepository<T>` wrapper over EF Core in Step 1 to keep the code clean and prevent anti-patterns.

### 5. Middleware Pattern (Pipeline / Behavioral)
- **Where**: `ExceptionHandlingMiddleware.cs`.
- **Why**: Catches all unhandled exceptions across any layer and translates them into uniform, consistent HTTP responses:
  - `NotFoundException` $\to$ **404 Not Found**
  - `ConflictException` $\to$ **409 Conflict**
  - `BusinessRuleException` $\to$ **400 Bad Request**
  - `ValidationException` $\to$ **400 Bad Request**
  - Unexpected errors $\to$ **500 Internal Server Error**

### 6. Interceptor Pattern (Client Aspect-Oriented Programming)
- **Where**: Angular `auth.interceptor.ts`.
- **Why**: Automatically intercepts all outbound HTTP requests in the frontend and injects the `Authorization: Bearer <token>` header without repeating code in individual services. Automatically clears state on HTTP 401.

### 7. Guard Pattern (Defensive Programming & Routing)
- **Where**:
  - Backend: Early-exit precondition checks in business services (e.g. `if (doctorBusy) throw new ConflictException(...)`).
  - Frontend: `auth.guard.ts` intercepts client navigation to private routes (`/dashboard`, `/patients`, etc.) and redirects unauthorized users to `/login`.

### 8. Salted Hash Cryptography Pattern (Security)
- **Where**: `PasswordHasher.cs`.
- **Why**: Plain passwords are never stored. Passwords are hashed using `HMAC-SHA512` with a unique 128-byte cryptographic salt per user, preventing rainbow table attacks.

### 9. Reactive Signal State Pattern (Frontend Architecture)
- **Where**: `AuthService.ts` (`currentUser()`, `isAuthenticated()`, `userRole()`).
- **Why**: Modern Angular Signals provide fine-grained, glitch-free reactivity without excessive RxJS subscription boilerplate.

---

## 4. Libraries & Packages Reference

| Package | Version | Layer | Architectural Justification |
| :--- | :--- | :--- | :--- |
| **`Microsoft.EntityFrameworkCore.SqlServer`** | 8.0.11 | DataAccess | Official Microsoft ORM provider for SQL Server and LocalDB with migration support. |
| **`Microsoft.EntityFrameworkCore.Design`** | 8.0.11 | DataAccess / API | Tooling required for EF Core CLI migrations and design-time model generation. |
| **`Microsoft.AspNetCore.Authentication.JwtBearer`**| 8.0.11 | API | ASP.NET Core middleware to decode, validate signatures, and parse claims from JWT tokens. |
| **`System.IdentityModel.Tokens.Jwt`** | 8.0.1 | Business | High-performance generation and signing of JSON Web Tokens. |
| **`FluentValidation.DependencyInjectionExtensions`**| 11.9.2 | Business | Clean, strongly-typed fluent validation rules separated from entity POCOs. |
| **`Swashbuckle.AspNetCore`** | 6.6.2 | API | Generates OpenAPI / Swagger interactive documentation with JWT Bearer authorization testing. |
| **`Microsoft.EntityFrameworkCore.InMemory`** | 8.0.11 | Tests | In-memory database provider allowing fast, isolated unit tests without requiring a running SQL Server instance. |
| **`xUnit`** | 2.8.2 | Tests | Modern, thread-isolated testing framework for .NET. |
| **`@angular/core` & `@angular/router`** | 22.0.7 | Frontend | Framework for standalone Single Page Application routing, components, and signals. |

---

## 5. Testing Strategy

The test suite in `HospitalManagement.Tests` contains **16 automated unit tests** that execute in under 1 second:

```
Total: 16 | Passed: 16 | Failed: 0 | Duration: < 1s
```

### Why EF Core InMemory for Layered Architecture Tests?
In traditional Layered Architecture, business services directly invoke `ApplicationDbContext`. By providing an isolated, unique in-memory database instance (`Guid.NewGuid().ToString()`) per test:
1. Each test starts with a completely pristine database state.
2. Tests run in parallel in-process with zero network or disk latency.
3. Business rules (such as appointment double-booking, cancelled appointment status transitions, and doctor department existence) are verified against genuine EF Core query execution.

---

## 6. Architecture Flaws in Step 1 (The Bridge to Hexagonal Architecture)

As senior architects, we must recognize the intentional architectural trade-offs of Traditional Layered Architecture:

1. **Database-Centric Design**: Notice how `Business` references `DataAccess`. The domain rules are subservient to database persistence rather than the core business being at the center.
2. **Coupling to Infrastructure**: If we decide to swap EF Core for Dapper, MongoDB, or a cloud service, our `Business` layer must be modified and recompiled because it depends directly on `ApplicationDbContext`.
3. **Leaky Abstractions**: EF Core concepts (such as `.Include()`, `.AsNoTracking()`, and lazy loading) exist inside our business service methods.

In **Step 2 (Hexagonal Architecture / Ports and Adapters)**, we will flip this dependency arrow using the **Dependency Inversion Principle (DIP)**: the Business core will declare **Ports** (interfaces), and DataAccess will become an **Adapter** that implements those ports!
