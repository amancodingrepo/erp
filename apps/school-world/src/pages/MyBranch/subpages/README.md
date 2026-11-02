# My Branch subpage map

Each My Branch link is implemented in its own component file. Database-backed fee pages use the shared module-data or fee API; other links retain their existing module-specific behaviour. The shared visual wrapper for the legacy/demo pages is `../MyBranchFeatureShell.jsx`.

## Users

| My Branch link | Page component |
|---|---|
| Birthdays | `BirthdaysPage.jsx` |
| Manage Staff | `ManageStaffPage.jsx` |
| Manage Bus Drivers | `ManageBusDriversPage.jsx` |
| Manage Staff Category | `ManageStaffCategoryPage.jsx` |

The links **Manage Parents and Children** and **Admit New Student** retain their existing routing to Manage Students and the Admission workflow.

## Academics

| My Branch link | Page component |
|---|---|
| Manage Classes | `ManageClassesPage.jsx` |
| Manage Subject Categories | `ManageSubjectCategoriesPage.jsx` |
| Manage Subject Types | `ManageSubjectTypesPage.jsx` |
| Manage Subjects | `ManageSubjectsPage.jsx` |
| Manage Marks Percentage for Leave Type | `ManageLeaveMarksPercentagePage.jsx` |
| Manage Academic Year | `ManageAcademicYearPage.jsx` |
| Change Class | `ChangeClassPage.jsx` |
| Promote Class | `PromoteClassPage.jsx` |
| Promote to Alumni | `PromoteToAlumniPage.jsx` |
| Manage House | `ManageHousePage.jsx` |
| Change House | `ChangeHousePage.jsx` |
| Manage Class Eligibility Criteria | `ManageClassEligibilityCriteriaPage.jsx` |
| Update Roll Numbers | `UpdateRollNumbersPage.jsx` |

**Manage Performance Report Templates** continues to open the Performance Report module.

## Administrative

| My Branch link | Page component |
|---|---|
| One Way Communication | `OneWayCommunicationPage.jsx` |
| Manage External Links | `ManageExternalLinksPage.jsx` |
| Upload student and parent photos in bulk | `BulkStudentParentPhotosPage.jsx` |
| Manage Principal Details | `ManagePrincipalDetailsPage.jsx` |
| Manage Book Centers | `ManageBookCentersPage.jsx` |
| Manage Fee Types | `ManageFeeTypesPage.jsx` |
| Manage Discount Types | `ManageDiscountTypesPage.jsx` |
| Manage Fee Templates | `src/pages/Templates/FeeStructure/ManageFeeTemplatesPage.jsx` |
| Manage Fee Installment Types | `ManageFeeInstallmentTypesPage.jsx` |
| Bulk Fees Upload | `BulkFeesUploadPage.jsx` |
| Shared create/edit/list component for discount/installment master data | `FeeMasterCatalogPage.jsx` |

Messages, Manage Routes and Manage Attendance Mode Types retain their existing module routing. The fee-related links open independent subpages for fee types, discounts, installment types, and bulk CSV upload. Fee structure template creation, editing, and application are organized under `src/pages/Templates/FeeStructure/` and retain the existing My Branch entry. Template application preserves one ledger row per fee type per original installment, and payment reversal/removal follows the guarded fee API workflow.
