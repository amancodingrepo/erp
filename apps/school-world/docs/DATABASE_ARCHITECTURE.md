# School Diary — Database Architecture

![System architecture](diagrams/system-architecture.png)

![Entity relationships](diagrams/entity-relationships.png)

## 1. Architecture overview

```mermaid
flowchart LR
  UI[React frontend] -->|same-origin /api requests| API[Express REST API]
  API --> AUTH[Authentication + role checks]
  AUTH --> TENANT[School tenant scope from authenticated account]
  TENANT --> DB[(PostgreSQL 16)]
  DB --> CORE[Core relational data]
  DB --> FLEX[JSONB state for secondary modules]
  DB --> AUDIT[Audit log]
```

## 2. Entity relationship diagram

```mermaid
erDiagram
  SCHOOLS ||--o{ ACADEMIC_YEARS : has
  SCHOOLS ||--o{ SCHOOL_CLASSES : defines
  SCHOOLS ||--o{ PEOPLE : directory
  SCHOOLS ||--o{ USER_ACCOUNTS : accounts
  SCHOOLS ||--o{ STUDENTS : enrolls
  SCHOOLS ||--o{ SCHOOL_ROUTES : operates
  SCHOOLS ||--o{ NOTICES : publishes
  SCHOOLS ||--o{ FEE_RECORDS : charges
  SCHOOLS ||--o{ ATTENDANCE_RECORDS : tracks
  SCHOOLS ||--o{ MODULE_RECORDS : stores
  SCHOOLS ||--o{ AUDIT_LOGS : audits
  PEOPLE o|--o{ USER_ACCOUNTS : linked_login
  PEOPLE o|--o{ STUDENTS : student_identity
  STUDENTS ||--o| STUDENT_DETAILS : extended_fields
  STUDENTS ||--o{ STUDENT_PARENTS : parent_link
  PEOPLE ||--o{ STUDENT_PARENTS : guardian_link
  STUDENTS ||--o{ FEE_RECORDS : fee_ledger
  STUDENTS ||--o{ ATTENDANCE_RECORDS : attendance
  NOTICES ||--o{ NOTICE_ATTACHMENTS : files
  NOTICES ||--o{ NOTICE_VIEWS : view_events
  PEOPLE ||--o{ NOTICE_VIEWS : views
  USER_ACCOUNTS o|--o{ AUDIT_LOGS : actor
  USER_ACCOUNTS o|--o{ NOTICES : author
  SCHOOLS {
    uuid id PK
    text name
    text code UK
    jsonb config
    boolean is_active
  }
  ACADEMIC_YEARS {
    uuid id PK
    uuid school_id FK
    text label
    boolean is_current
  }
  SCHOOL_CLASSES {
    uuid id PK
    uuid school_id FK
    text class_name
    text section
  }
  PEOPLE {
    uuid id PK
    uuid school_id FK
    text person_type
    text external_id
    text full_name
    text email
    text contact_number
  }
  USER_ACCOUNTS {
    uuid id PK
    uuid school_id FK
    uuid person_id FK
    text email UK
    text password_hash
    text role
    boolean must_change_password
    boolean is_active
  }
  STUDENTS {
    uuid id PK
    uuid school_id FK
    uuid person_id FK
    text student_code
    text name
    text academic_year
    text class_name
    text status
    boolean fee_defaulter
  }
  STUDENT_DETAILS {
    uuid id PK
    uuid school_id FK
    uuid student_id FK
    jsonb details
  }
  STUDENT_PARENTS {
    uuid student_id FK
    uuid parent_person_id FK
    text relationship
    boolean is_primary
  }
  SCHOOL_ROUTES {
    uuid id PK
    uuid school_id FK
    text name
    text vehicle_number
    text driver_name
  }
  NOTICES {
    uuid id PK
    uuid school_id FK
    text academic_year
    text board
    text audience_key
    text notice_type
    text message
    uuid author_user_id FK
  }
  NOTICE_ATTACHMENTS {
    uuid id PK
    uuid school_id FK
    uuid notice_id FK
    text file_name
    bytea file_data
  }
  NOTICE_VIEWS {
    uuid id PK
    uuid school_id FK
    uuid notice_id FK
    uuid viewer_person_id FK
    timestamptz viewed_at
  }
  FEE_RECORDS {
    uuid id PK
    uuid school_id FK
    uuid student_id FK
    text academic_year
    numeric amount
    numeric amount_paid
  }
  ATTENDANCE_RECORDS {
    uuid id PK
    uuid school_id FK
    uuid student_id FK
    date attendance_date
    text status
  }
  MODULE_RECORDS {
    uuid id PK
    uuid school_id FK
    text module_key
    text record_key
    jsonb payload
  }
  AUDIT_LOGS {
    uuid id PK
    uuid school_id FK
    uuid actor_user_id FK
    text action
    jsonb details
  }
```

## 3. Table responsibilities

| Table | Responsibility | Implementation |
|---|---|---|
| `schools` | Tenant, school name/code/contact/configuration | Relational tenant root |
| `academic_years` | School-specific years and current-year flag | Relational |
| `school_classes` | Configured class/section options | Relational |
| `people` | Identities for students, parents, teachers, staff, guardians and other recipients | Relational |
| `user_accounts` | Login, role, hashed password, activation and forced password change | Relational |
| `students` | Student listing, photo, identity, contact, class/year, flags and metadata | Relational + metadata JSONB |
| `student_details` | Additional edit form fields not normalized to student columns | JSONB per student |
| `student_parents` | Student-to-parent links, relationship and primary-contact flag | Relational bridge |
| `school_routes` | Routes, stops, vehicle, driver and activation | Relational |
| `notices` | Notice year/category/audience/type/message/author/reply permission | Relational |
| `notice_attachments` | Attachment name, MIME type, size and binary content | Relational; bytes in PostgreSQL for this starter |
| `notice_views` | First read timestamp per unique notice/person pair | Relational, unique constraint prevents duplicate unique-view counts |
| `fee_records` | Student fee charges, payments, due date and reference | Relational |
| `attendance_records` | Attendance status per student/date | Relational |
| `events`, `messages` | Event and message primitives | Relational |
| `questionnaires`, `questionnaire_responses` | Questionnaire definitions and responses | Relational + JSONB answers/options |
| `store_inventory`, `store_vendors` | Inventory and vendor records | Relational + metadata JSONB |
| `module_records` | State for secondary modules not yet normalized to domain-specific entities | JSONB per school/module key |
| `audit_logs` | Important account, school setting, notice and fee changes | Relational audit trail |
| `schema_migrations` | Version ledger maintained by the migration runner | Relational |

## 4. Design rules

- **Tenant isolation:** each school-owned entity stores `school_id`. API routes resolve school scope from the authenticated account rather than trusting a request body. Queries should constrain both primary rows and joined rows to the authenticated tenant.
- **Identity versus login:** `people` stores real-world recipients; `user_accounts` supplies optional login access. A recipient can be registered before an account is created.
- **Notice eligibility:** notices target school, class or route through `board` and `audience_key`. `eligiblePeople()` calculates the recipient directory from the student, guardian and route mappings. Notice views are only recorded for authenticated eligible identities.
- **Unique notice view:** `notice_views` uses `UNIQUE(notice_id, viewer_person_id)`, so repeated opens don't increase unique view counts.
- **Server-owned database:** browser code only calls `/api`; DB credentials remain inside server/Docker configuration.
- **Core + flexible data:** important flows use relational tables and APIs. Some generic module state remains JSONB in `module_records`. Normalize those workflows as they mature and require complex querying/reporting.
- **Files:** student photos and notice attachments are stored in PostgreSQL in this starter. For large production use, store binary objects in private object storage and retain keys/metadata in PostgreSQL.

## 5. Indexes and common queries

`schema.sql` creates indexes for school/year/class, school/status, case-insensitive student name, people type/class, people route, notices by school/year/date, notices by category/audience, notice views by school/notice, and audit log chronology. Add indexes based on observed production query plans and query latency rather than indexing every field.

## 6. Migration workflow

The migration runner creates `schema_migrations` and applies `server/migrations/001_initial_schema.sql` once, inside a transaction. Never edit an already-applied migration in a live environment. Add `002_descriptive_change.sql`, include it in the ordered migration list in `server/migrate.js`, and update this document. `server/schema.sql` remains the complete snapshot used for review; the initial migration must stay identical to that baseline until new migration files introduce later changes.
