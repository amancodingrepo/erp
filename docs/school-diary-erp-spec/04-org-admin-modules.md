# Org Admin modules

Recorded on first landing, before switching to Branch Admin. Org Admin is the multi-campus / trust view.

## Sidebar

| Label | Route | Function |
| --- | --- | --- |
| Notice Board | `/NoticeBoard` | Same engine, plus **School Branches** picker and class list of the selected branch |
| Dashboard | `/React/Dashboard` | React org dashboard |
| Events | `/events/Monthly` | Calendar |
| Messages | `/OrgAdmin/BranchMessages` | Messages across branches |
| Attendance | `/attendance` | Attendance |
| School Branches | `/OrgAdmin/BranchContacts` | Branch directory / contacts |
| Reports | `/Reports/Reports` | Same reports hub (scope may be org-wide) |
| Process Order | `/Store/ProcessOrder` | Store fulfillment |
| School Branch Reports | `/SchoolDailyReport/Report` | Daily campus report pack |
| Manage Corporates | `/ManageCorporates` | Corporate / company tie-ups (fee sponsorship). Related report: `/Reports/CorporateStudentsReport` |
| Store Vendor | `/StoreVendor` | Vendor master |

## Notice Board differences vs Branch Admin

Org Admin Notice Board:

- Year filter
- **School Branches** dropdown
- School Notice Board + Class Notice Boards for the selected branch
- Tabs: **News** | **Alert** | **Home Connect**
- No composer on the landing view that was captured (read/monitor posture)
- Class list is long (KG through grade 12 plus dummy/old sections)

Branch Admin Notice Board:

- Fixed to one campus
- Composer enabled
- Extra Day Care + Route boards
- Extra All Teachers channel

## Role-switch back

From Branch Admin user menu:

```
/login/Variant?id={orgAdminVariantId}
```

returns the Org Admin shell.

## ERP takeaway

If you only serve one campus, skip Org Admin. If you serve groups:

- Org sees roll-up dashboards, corporates, cross-branch messages, daily branch reports.
- Branch owns SIS, fees posting, notice composition, transport day-to-day.
- Shared masters (fee types, vendors) can live at org and be inherited.
