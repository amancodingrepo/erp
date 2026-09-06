# College ERP blueprint

Cleaned crawl of the MPOnline **demo** admin UI, rewritten as a domain map for a **new** college ERP.
Not a clone spec. Not their HTML/JS. Source paths are kept only so we can see where an idea came from.

- **35 modules**
- **335 screens**
- **830 operations** (inferred GET/POST/DELETE)

## Build order

1. **core** — dashboard, students, admission, fees, attendance, examinations, academics, hr, system
2. **extended** — payroll, finance, library, hostel, transport, inventory, communicate, reports, …
3. **optional** — NAAC, LMS, canteen, live classes, CMS, multi-campus

## Files

- `blueprint.json` — canonical machine-readable spec
- `screens.csv` — one row per screen
- `operations.csv` — one row per inferred API operation

## Modules

| Priority | Module | Screens | Operations |
|---|---|---:|---:|
| core | Academics (`academics`) | 19 | 31 |
| core | Admission (`admission`) | 12 | 43 |
| core | Attendance (`attendance`) | 6 | 3 |
| core | Dashboard (`dashboard`) | 1 | 0 |
| core | Examinations (`examinations`) | 40 | 119 |
| core | Fees (`fees`) | 24 | 47 |
| core | Human Resource (`hr`) | 26 | 74 |
| core | Students (`students`) | 23 | 38 |
| core | System Settings (`system`) | 21 | 37 |
| extended | Assignments (`assignments`) | 2 | 11 |
| extended | Certificates (`certificates`) | 5 | 11 |
| extended | CO-PO / OBE (`outcomes`) | 8 | 42 |
| extended | Communicate (`communicate`) | 10 | 37 |
| extended | Download Center (`downloads`) | 4 | 18 |
| extended | Front Office (`front-office`) | 12 | 54 |
| extended | Hostel (`hostel`) | 9 | 22 |
| extended | Income & Expense (`finance`) | 7 | 9 |
| extended | Inventory (`inventory`) | 9 | 13 |
| extended | Lesson Plan (`lesson-plan`) | 7 | 20 |
| extended | Library (`library`) | 5 | 4 |
| extended | Payroll (`payroll`) | 10 | 27 |
| extended | Transport (`transport`) | 8 | 18 |
| optional | Activity Management (`activities`) | 3 | 23 |
| optional | Alumni (`alumni`) | 3 | 7 |
| optional | Calendar (`calendar`) | 1 | 0 |
| optional | Canteen (`canteen`) | 7 | 17 |
| optional | Feedback (`feedback`) | 7 | 6 |
| optional | Live Classes (`live-classes`) | 10 | 14 |
| optional | Mentoring (`mentoring`) | 5 | 9 |
| optional | Multi Campus (`multi-campus`) | 2 | 0 |
| optional | NAAC (`naac`) | 8 | 9 |
| optional | Online Courses (`lms`) | 6 | 41 |
| optional | Public Website CMS (`cms`) | 8 | 6 |
| optional | Room Booking (`room-booking`) | 3 | 13 |
| optional | Training & Placements (`placements`) | 4 | 7 |

## Route conventions (ours)

- No `/admin` prefix — auth/roles live in the app, not the URL
- kebab-case: `markEntrySubjectwise` → `/examgroup/mark-entry-subjectwise`
- numeric ids → `:id`
- operations inferred: `get*`/`search*` → GET, `save*`/`add*`/`update*` → POST, `delete*` → DELETE

## Do not implement from this file

- Captcha, session-cookie names, CSRF field names from the vendor app
- Their chatbot / Gemini key wiring
- Backup/restore of their database
- Pixel-copy of their UI

