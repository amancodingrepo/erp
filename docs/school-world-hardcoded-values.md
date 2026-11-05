# School World: hard-coded values audit

School World is multi-tenant: every school (campus) must see its own name, logo, contact details, years, classes and lists. Nothing school-specific should be built into a screen.

This audit lists every value found hard-coded in `apps/school-world/src`. For each one it gives where it is, what it should come from in the database, and whether it's fixed.

**Status key**
- **Fixed** — done in the `feature/topbar-tenant-settings` change.
- **To do** — still hard-coded. The database source already exists unless stated.

**Where school data lives**
- **`Campus` row:** name, code, address, phone, email, timezone, date format, start month, currency (code, format and position) and the current session.
- **`Setting` `school-world-config` (per campus):** the logo (`logoDataUrl`) and School World options.
- **Per-school tables:** classes, sections, sessions, leave types, categories, staff categories, houses, transport routes and designations.

---

## 1. Branding and identity

| Value | Where | Should come from | Status |
|---|---|---|---|
| Sanford School logo image in the sidebar | `pages/Students/ManageStudentsHeader.jsx` (imported `assets/sanford-school-logo-5.png`) | Campus logo: `school-world-config.logoDataUrl`, served by `GET /api/school/logo`, URL in `user.school.logoUrl` | **Fixed**: `components/topbar/SchoolLogo.jsx`; initials and name when no logo is set |
| Sanford logo printed on **staff ID cards** | `pages/MyBranch/subpages/ManageStaffPage.jsx` (card preview and JPEG) | Campus logo (as above) | **Fixed**: uses the school's logo, or none |
| Default school name "Sanford School" | `school-config.js` (`DEFAULT_SCHOOL_NAME`), `DatabaseSession.jsx` (`installRuntimeConfig`) | `Campus.name` from the signed-in user | **Fixed**: no built-in name |
| No way for a school to set its own logo (only the unreachable Super Admin page) | — | `PATCH /api/school/settings` (admin or principal) | **Fixed**: Settings → **School profile** (name, address, phone, email, logo). Logos must be PNG, JPEG or WebP up to 1 MB; SVG is refused because it can carry script |
| Logo not included in the sign-in or session data | `apps/erp/src/lib/school-world-shape.ts` | `schoolBranding(campusId)` | **Fixed**: `user.school.logoUrl` (versioned URL, cached; the image isn't inline) |
| "School World" fallback on staff ID card headers | `ManageStaffPage.jsx` (lines ~298, 722, 1067) | `Campus.name` (always set) | To do: drop the product-name fallback |
| Product brand "School World", sign-in marketing copy, "PostgreSQL-backed edition" footer | `pages/Auth/LoginPage.jsx`, top bar | Platform level (`Organization`), only if white-labelling is wanted | Keep for now; decide whether schools get white-label branding |
| "Standalone prototype" note under the sidebar | `ManageStudentsHeader.jsx` | — (untrue) | **Fixed**: removed |

## 2. Data that must never be bundled

| Value | Where | Should come from | Status |
|---|---|---|---|
| ~3,000 lines of fictional students (`STG-STU-…`) used as the Manage Students starting list until the real list loaded, and still shown if loading failed | `student-data.js`, imported by `main.jsx` | `GET /api/students` | **Fixed**: file deleted; the list starts empty; the old browser copy is cleared |
| Student details read from an old browser cache (`schoolDiaryCorrectedV4.detailsByStudentId…`) before the database answers | `main.jsx` (`DETAILS_STORAGE_KEY`) | `GET /api/student-details` | To do: stop reading it and clear it. It's stale, and isn't scoped per school on a shared computer |
| Demo notices with made-up names (JYOTI SHASTRI, PRIYANKA JAIN) | `pages/NoticeBoard/noticeBoardUtils.js` (`seedNotices`, imported but unused) | `GET /api/notices` | To do: delete the dead code |
| Vehicle numbers `MP09AF3494`… as the default notice route | `noticeBoardUtils.js` (`DEFAULT_NOTICE_ROUTES`) | `GET /api/routes` (already fetched on that screen) | To do: start with the first real route, or none |

## 3. School lists hard-coded in forms

| List | Where | Should come from | Status |
|---|---|---|---|
| Leave types ("Medical Leave", "Tournament Leave", …) | `pages/MyBranch/AcademicOperationPage.jsx` (`LEAVE_TYPE_OPTIONS`) | `GET /v1/leave-types` | To do |
| Student categories (GENERAL, OBC, SC, ST, EWS) | `pages/MyBranch/subpages/AdmitStudentIdentityForm.jsx` (`CATEGORY_OPTIONS`) | `GET /v1/categories` | To do |
| Staff role categories (Fees, Transport, Uniforms, …) | `ManageStaffPage.jsx` (`ROLE_CATEGORIES`) | `GET /api/staff-categories` | To do |
| Bank names | `ManageStaffPage.jsx` (`BANKS`) | A per-school option list, or free text | To do (low) |
| Default class "PRE NURSERY A" for a new or edited student | `student-form-utils.js`, `pages/Students/StudentActionDialog.jsx`, `StudentDetailsTab.jsx` | The school's first class from `GET /v1/classes` (or no default) | To do |
| Default academic year "2026-2027" | `student-form-utils.js` | The current session (`Campus.currentSessionId`; `/bootstrap` `academicYears[].isCurrent`) | To do |
| Default nationality "Indian" | `student-form-utils.js` | A campus setting (country), or no default | To do (low) |
| Religion, blood group, disability, vaccine and relation options | Admission and staff forms | Fine as built-in options; make them configurable only if schools ask | Keep |

## 4. Locale, money and time

| Value | Where | Should come from | Status |
|---|---|---|---|
| Rupee sign `₹` and `en-IN` number formatting | About 21 and 26 files respectively (fees, payroll, contacts, students, Campus desk screens) | `Campus.currencyCode` / `currencyFormat` / `currencyPlace`; add them to `user.school` and use one shared `money()` formatter | To do (medium; matters as soon as a non-INR school is added) |
| Timezone `Asia/Kolkata` defaults | `DatabaseSession.jsx`, several date helpers | `Campus.timezone` (already in `user.school.timezone`) | To do: use the school's value everywhere dates are shown or "today" is worked out |
| Date format | Various `toLocaleDateString()` calls | `Campus.dateFormat` | To do (low) |

## 5. Top bar and account

| Item | Before | Status |
|---|---|---|
| Bell icon | Decorative; did nothing | **Fixed**: notifications menu with an unread badge, from `GET /api/notifications` (staff only, scoped to the campus). It shows unread messages, notices you haven't opened in the last 30 days, leave requests waiting for approval (for those allowed to approve) and new online applications. It refreshes every 60s while the tab is visible. Clicking an item marks it read and opens it |
| Settings icon | Decorative | **Fixed**: Settings menu. Admins and principals get School profile, Campus settings, Users, Roles & permissions and All system settings (Campus desk); others get a note and My account |
| Profile icon and name, plus a separate Sign out button | Static icon, name, inline button | **Fixed**: one profile menu (as in School Diary's avatar menu: Profile, Password, Change School, Logout). It shows name, email, role and school, with My account, Change password, Switch campus (platform admins only) and **Sign out inside the menu** |
| "School Admin" greeting fallback | `pages/Dashboard/DashboardHero.jsx`, `ContactsRecordEditPage.jsx` | To do: use the user's name and role label |
| Parent / teacher portal header | `pages/NoticeBoard/RecipientPortalHeader.jsx` still has its own Sign out and no profile menu | To do: reuse the profile menu there (notifications would need a non-staff version) |

## 6. Related issues found while auditing (not hard-coding)

- **Fixed: notices are now filtered by audience** (`apps/erp/src/lib/notice-audience.ts`). Before, any signed-in parent or student got every published notice, including staff-only ones.
  - **Staff:** still see every notice in their school.
  - **Parents and students:** see whole-school notices, plus notices for their (or their child's) class, bus route or day care. Teacher-only, scheduled, unpublished and unknown-audience notices are hidden.
  - **Also covered:** the older `/api/v1` notice lists, the student portal, opening or marking a notice, and its attachments and replies (a family sees only staff replies and its own).
  - **Staff only:** the who-read, receipts and not-viewed reports, which name other families. The parent and student notice list returns the view count, not the list of viewers.
- **Unused `/api/v1/auth/forgot-password` and `set-password` endpoints.** The reset token is never delivered to anyone (see the sign-in fix). Wire them to email once email is configured, or remove them.
- **The old `/staff/...` screens and the ERP `/login` are still live** alongside School World.

---

## How to keep it this way
- **A new screen must not import images or name lists for a specific school.** It reads the school from `useDatabaseSession().user.school` (name, code, contact details, `logoUrl`, timezone) and lists from the school's API.
- **Test data stays out of the app.** Fixtures for tests belong under `tests/`, not in `src/`.
- **Check before merging.** `grep -rniE "sanford|indore|college\.local|MP09" apps/school-world/src` should only find i18n strings and CSV-template examples.
