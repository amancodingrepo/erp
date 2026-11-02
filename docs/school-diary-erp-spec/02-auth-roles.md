# Auth and roles

## Public / unauthenticated routes

| Route | Function |
| --- | --- |
| `/` | Redirects to login |
| `/Login?ReturnUrl=%2f` | Login form |
| `/login/RequestOtp` | Forgot password / OTP |
| `/Info/Terms` | Terms, refund, privacy |
| `/Info/Faq` | FAQ |
| `/ContactUs` | Contact |

## Login form

- Country code dropdown (default India +91)
- `UserName` — email or phone
- `Password`
- Anti-forgery token (`__RequestVerificationToken`)
- Submit: LOGIN
- Copy: “By logging in, you agree to our Terms, Refund and Privacy policy”

This is a conventional ASP.NET form POST login.

## Role switching

One account can hold several **variants**. Switching does not re-enter password; it hits:

```
GET /login/Variant?id={variantId}
```

Observed variants on this principal account:

| Role | Scope | Notes |
| --- | --- | --- |
| OrgAdmin | Organization / Annie Besant School | Multi-branch notice boards, corporates, org dashboard |
| BranchAdmin | Annie Besant School | Full campus operations menu |
| BranchAdmin | Lord Krishna Public School | Same role type, different campus |

User-menu label pattern:

```
Change Role/School
  OrgAdmin
    ANNIE BESANT SCHOOL
  BranchAdmin
    ANNIE BESANT SCHOOL
  BranchAdmin
    Lord Krishna Public school
```

## Account routes

| Route | Function |
| --- | --- |
| `/user/Profile` | View/edit logged-in profile |
| `/user/Password` | Change password |
| `/login/LogOff/English` | Sign out (locale in path) |

## Roles implied by the UI (for your ERP)

Implement these as first-class roles, even if you start with fewer:

- Super / Org Admin (trust or multi-campus)
- Branch Admin / Principal
- Teacher
- Class teacher
- Accountant / fee clerk
- Transport in-charge / driver
- Daycare staff
- Librarian
- Store / vendor operator
- Parent
- Student (usually app-only)

## Permission patterns observed

- Branch Admin can compose school-wide and class notices, enable replies, delete notices, export viewership.
- Branch Admin can pay/edit student fees, send reminders, reverse payments, bulk-pay.
- Contacts show Edit / deactivate-style control / Fee Details per person.
- Messages are 1:1 (or 1:family) with Inbox / Sent, attachment, calendar, recipient picker.
- “One Way Communication” under My Branch can disable parent→staff chat for selected roles.
- Day Care is present in nav even when the branch has zero daycare enrollments.
- Attendance Dashboard is an Angular app that still works under Branch Admin, despite the `/ng/orgadmin-dash/...` path name.

## Recommended auth model for your ERP

```
User
  └── Membership
        org_id
        branch_id (nullable for org-level)
        role
        is_active

Session stores: user_id + active_membership_id
```

Switching school/role = switching `active_membership_id`, then reload nav from that membership’s permission set.
