# Employee Salary Management ERD

```mermaid
erDiagram
    AdminUser ||--o{ AuthSession : has
    Employee ||--o{ BasicSalaryAssignment : retains
    Employee ||--o{ EmployeeSalaryComponent : retains
    SalaryComponent ||--o{ EmployeeSalaryComponent : defines

    AdminUser {
        int id PK
        string username UK
        string passwordHash
        timestamptz createdAt
    }
    AuthSession {
        string id PK
        int adminUserId FK
        string tokenHash UK
        timestamptz createdAt
        timestamptz expiresAt
        timestamptz revokedAt "nullable"
    }
    Employee {
        int id PK
        string employeeId
        string employeeIdKey UK
        string firstName
        string middleName "nullable"
        string lastName
        date dateHired
        boolean isActive
        int version
        timestamptz createdAt
        timestamptz updatedAt
    }
    BasicSalaryAssignment {
        int id PK
        int employeeId FK
        decimal amount "numeric(14,2) PHP"
        boolean isActive
        timestamptz recordedAt
        timestamptz endedAt "nullable"
    }
    SalaryComponent {
        int id PK
        string name
        string nameKey "active-only unique"
        boolean isActive
        int version
        timestamptz createdAt
        timestamptz updatedAt
    }
    EmployeeSalaryComponent {
        int id PK
        int employeeId FK
        int componentId FK
        decimal amount "numeric(14,2) PHP"
        boolean isActive
        timestamptz recordedAt
        timestamptz endedAt "nullable"
    }
```

## Relational Constraints and Invariants
- AdminUser: Unique username, bcrypt password hash.
- AuthSession: Hashed verifier (`tokenHash`) stored in DB; raw 32-byte secret in HttpOnly cookie. Fixed 8-hour expiry from creation (`expiresAt = createdAt + 8h`). Revoked on logout (`revokedAt`).
- Partial unique indexes:
  - `BasicSalaryAssignment(employeeId)` WHERE isActive = true (or `endedAt IS NULL`)
  - `SalaryComponent(nameKey)` WHERE isActive = true (or `endedAt IS NULL`)
  - `EmployeeSalaryComponent(employeeId, componentId)` WHERE isActive = true (or `endedAt IS NULL`)
- Monetary precision: PostgreSQL `numeric(14,2)` for exact decimal representation (max PHP 999,999,999,999.99).
- Hire date: PostgreSQL `date`.
