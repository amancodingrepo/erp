# Routes catalog

Base: `https://in.schooldiary.me`

Only routes observed in the UI. Query parameters listed when they are part of the product contract.

## Auth and account

| Method-style | Path |
| --- | --- |
| page | `/Login?ReturnUrl=` |
| page | `/login/RequestOtp` |
| action | `/login/Variant?id={variantId}` |
| action | `/login/LogOff/English` |
| page | `/user/Profile` |
| page | `/user/Password` |

## Public info

| Path |
| --- |
| `/Info/Terms` |
| `/Info/Faq` |
| `/ContactUs` |

## Communication

| Path | Notes |
| --- | --- |
| `/NoticeBoard` | Default board |
| `/NoticeBoard?schoolBranchId=&channelId=&academicYearId=` | Channel scoped |
| `/NoticeBoard?schoolBranchId=&channelId=&type=News\|Alert\|Homework&academicYearId=` | Typed feed |
| `/NoticeBoard/ExportViewsToExcel?channelMessageId=` | Read receipt export |
| `/NoticeBoard/ExportNotViewedToExcel?channelMessageId=` | Non-reader export |
| `/messages` | Branch inbox |
| `/OrgAdmin/BranchMessages` | Org inbox |
| `/Admin/BranchMessages` | Branch message admin |
| `/Admin/BranchMessages/DisableRoleCommunication` | One-way comms |
| `/events/Monthly` | Calendar month |

## Branch administration

| Path |
| --- |
| `/Admin/ManageBranch` |
| `/Admin/ManageBranch/Users` |
| `/Admin/Admission` |
| `/Admin/Birthday` |
| `/Admin/Staff` |
| `/Admin/Driver` |
| `/Admin/StaffCategory` |
| `/Admin/Grade` |
| `/Admin/SubjectCategory` |
| `/Admin/SubjectType` |
| `/Admin/Subject` |
| `/Admin/LeavesMarksPercent` |
| `/Admin/AcademicYear` |
| `/Admin/GradePromotion?procedure=Change` |
| `/Admin/GradePromotion?procedure=Promote` |
| `/Admin/GradePromotion?procedure=Alumni` |
| `/Admin/House` |
| `/Admin/HouseChange` |
| `/Admin/GradeEligibility` |
| `/RollNumber` |
| `/Admin/FeeType` |
| `/Admin/DiscountType` |
| `/Admin/FeeTemplate` |
| `/Admin/ManageLinks` |
| `/Admin/FeesUpload` |
| `/Admin/BulkStudentAndParentPhotoUpload` |
| `/Admin/AttendanceModeType` |
| `/Admin/ManagePrincipals` |
| `/Admin/FeeInstallment` |
| `/Library/LibraryCenter` |
| `/Admin/DepositSlips` |

## People / CRM

| Path |
| --- |
| `/Contacts` |
| `/SearchUsers` |
| `/OrgAdmin/BranchContacts` |

## Fees

| Path |
| --- |
| `/Fees` |
| `/Fees/BulkFeePayment` |
| `/Fees/FeesConcessionReport` |
| `/LateFeeConfiguration` |
| `/ReversePayment` |
| `/ChequeSubmitted` |
| `/FeesDueReport` |

## Attendance

| Path |
| --- |
| `/attendance` |
| `/attendance/AttendanceReport` |
| `/ng/orgadmin-dash/organization` |
| `/ng/orgadmin-dash/schoolbranch/{branchId}/{name}/{yyyy-MM-dd}` |

## Academics / performance

| Path |
| --- |
| `/StudentPerformance` |
| `/PerformanceReports/Template` |

## Admission

| Path |
| --- |
| `/AdmissionForm` |
| `/AdmissionForm?Enquiry=True` |
| `/AdmissionForm/Create` |
| `/AdmissionForm/Builder` |
| `/AdmissionForm/DownloadEmptyEnquiryForm` |
| `/AdmissionForm/DownloadEmptyAdmissionForm` |
| `/AdmissionForm/OrgPage` |
| `/Admin/AdmissionFormTermConditions` |

## Daycare / other programs

| Path |
| --- |
| `/daycare` |

## Transport

| Path |
| --- |
| `/Transport/Dashboard` |
| `/Transport/Buses` |
| `/Transport/Staff` |
| `/Transport/Routes` |
| `/Transport/Slabs/Overview` |
| `/Transport/Slabs/Summary` |
| `/Transport/Reports/RouteSafety` |
| `/Transport/Reports/TripPlayback` |
| `/Transport/Reports/Speed` |
| `/Transport/Reports/OverallDistance` |
| `/Transport/Reports/Distance` |
| `/Transport/Reports/RoutesTiming` |
| `/Transport/Reports/TransportReport` |
| `/Transport/Reports/OverSpeedReport` |
| `/Transport/Reports/ChildRouteHistoryReport` |
| `/Transport/Reports/SummaryReport` |
| `/Transport/Reports/RescheduledRoutesReport` |
| `/Transport/Reports/DateWiseFuelReport` |
| `/Transport/Reports/VehicleDetailsReport` |

## Store / ecommerce

| Path |
| --- |
| `/Store/Dashboard` |
| `/Store/BuyKits` |
| `/Store/ProcessOrder` |
| `/Store/ProcessOrder/DeliverProducts` |
| `/Store/ManageProducts` |
| `/Store/ManageStoreProductVendor` |
| `/StoreVendor` |
| `/ng/ecommerce/child-order-creation` |
| `/ng/ecommerce/list-orders` |

## Org-level extras

| Path |
| --- |
| `/React/Dashboard` |
| `/SchoolDailyReport/Report` |
| `/ManageCorporates` |

## Reports hub

`/Reports/Reports` plus the individual report paths in [06-reports-catalog.md](06-reports-catalog.md).

## Questionnaires

| Path |
| --- |
| `/Questionnaires` |

## Path conventions useful for your ERP

- `/Admin/*` — branch configuration masters
- `/OrgAdmin/*` — multi-branch views
- `/Reports/*` — mostly GET report pages with filters
- `/Transport/*` — nested transport app
- `/ng/*` — Angular SPAs (attendance dash, ecommerce)
- `/React/*` — React org dashboard
- Resource IDs are opaque 18–19 digit integers, not sequential row ids in the URL
