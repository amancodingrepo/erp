# Production pack status

This folder is the implementation contract. Discovery docs in the parent folder stay as narrative.

## Confidence legend

| Tag | Meaning |
|---|---|
| LIVE | Seen on authenticated demo pages |
| DERIVED | Implied by live routes + those fields |
| STANDARD | Needed to make the system work |

## Ready to implement

- Org / session / class / section / program / subject — LIVE
- Student create + search — LIVE
- Collect Fees end-to-end — LIVE (`collect-fees-live.md`)
- Mark entry cascade + save — LIVE (`mark-entry-live.md`)
- Staff / parent / student login fields + student 360 tabs — LIVE (`portals-live.md`)
- Fee types/groups/discounts, exam types, settings — LIVE
- Prisma + REST + permissions + tests — DERIVED from the above

## Still not live-captured

- Payment gateway callback payload
- Admit card / marksheet HTML placeholders
- Student self-service pages (no student password used)
- Hostel / library / enquiry form fields (routes known)

## Source of truth order

1. `schema.prisma`
2. `collect-fees-live.md` / `mark-entry-live.md` / `portals-live.md`
3. `field-catalog-live.md`
4. `api-contracts.md`
5. `permissions.md`
6. `acceptance-tests.md`
