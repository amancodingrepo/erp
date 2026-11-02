"use client";

import type { ReactNode } from "react";
import AcademicsHub from "@/components/modules/academics-hub";
import StudentsList from "@/components/modules/students-list";
import StudentsOps from "@/components/modules/students-ops";
import FeesOps from "@/components/modules/fees-ops";
import AttendanceOps from "@/components/modules/attendance-ops";
import ExamsOps from "@/components/modules/exams-ops";
import CampusOps from "@/components/modules/campus-ops";
import ReportView from "@/components/modules/report-view";
import AdmissionOps from "@/components/modules/admission-ops";
import PaymentOps from "@/components/modules/payment-ops";
import HousingOps from "@/components/modules/housing-ops";
import CommsOps from "@/components/modules/comms-ops";
import CertificateOps from "@/components/modules/certificate-ops";
import FrontOfficeOps from "@/components/modules/front-office-ops";
import LibraryOps from "@/components/modules/library-ops";
import ExamFormOps from "@/components/modules/exam-form-ops";
import PayrollOps from "@/components/modules/payroll-ops";
import UsersPage from "@/app/(staff)/staff/users/page";
import ExamsPage from "@/app/(staff)/staff/exams/page";
import CollectFeesPage from "@/app/(staff)/staff/fees/collect/page";
import AttendancePage from "@/app/(staff)/staff/attendance/page";
import RequestsOps from "@/components/modules/requests-ops";
import CreateStudentPage from "@/app/(staff)/staff/students/create/page";
import PhaseBScreen from "@/components/modules/phase-b";
import EngagementOps from "@/components/modules/engagement-ops";
import BranchOps from "@/components/modules/branch-ops";
import DirectoryOps from "@/components/modules/directory-ops";
import AdmissionFormsOps from "@/components/modules/admission-forms-ops";
import DashboardPage from "@/app/(staff)/staff/dashboard/page";

export const LEFTOVER_LIVE: Record<string, () => ReactNode> = {
  "/staff/admission/dashboard": () => <AdmissionOps mode="inbox" />,
  "/staff/admission/selection-status-report": () => <AdmissionOps mode="manage" />,
  "/staff/admission/summary-report": () => <AdmissionOps mode="manage" />,
  "/staff/admission/report": () => <ReportView reportKey="admission-tests" />,
  "/staff/student/dashboard": () => <StudentsList />,
  "/staff/student/bulkupdate": () => <StudentsOps mode="import" />,
  "/staff/student/bulkdelete": () => <StudentsList defaultStatus="DISABLED" />,
  "/staff/student/assign-optional-course": () => <StudentsOps mode="rolls" />,
  "/staff/student/semester-allocation": () => <AcademicsHub tab="sections" />,
  "/staff/student/approve-optional-course": () => <StudentsOps mode="rolls" />,
  "/staff/student/upload-student-documents": () => <CreateStudentPage />,
  "/staff/student/upload-student-photo": () => <EngagementOps mode="photos" />,
  "/staff/student/assign-seat-number": () => <StudentsOps mode="rolls" />,
  "/staff/student/bulkmail": () => <CommsOps mode="compose" />,
  "/staff/student/profilesetting": () => <CampusOps mode="settings" />,
  "/staff/student-log-update": () => <ReportView reportKey="user-log" />,
  "/staff/stdscholarship": () => <FeesOps mode="discounts" />,
  "/staff/liberal-art/liberal-art-student": () => <CreateStudentPage />,
  "/staff/liberal-art/liberal-art-report": () => <ReportView reportKey="students" />,
  "/staff/liberal-art/admissionsetting": () => <AdmissionOps mode="settings" />,
  "/staff/fee-receipt-import": () => <EngagementOps mode="fees-import" />,
  "/staff/fees-bulk-pay": () => <EngagementOps mode="bulk-pay" />,
  "/staff/fees/bulkfeepayment": () => <EngagementOps mode="bulk-pay" />,
  "/staff/studentfee/fee-summary-dashboard": () => <CollectFeesPage />,
  "/staff/offlinepayment": () => <FeesOps mode="due" />,
  "/staff/studentfee/searchpayment": () => <FeesOps mode="receipts" />,
  "/staff/assign-variable-fees": () => <FeesOps mode="assign" />,
  "/staff/fees-type-group": () => <FeesOps mode="groups" />,
  "/staff/feesforward": () => <FeesOps mode="masters" />,
  "/staff/paymentcategory/collegeotherfees": () => <FeesOps mode="types" />,
  "/staff/fees-installment": () => <FeesOps mode="installments" />,
  "/staff/paymentcategory": () => <PaymentOps />,
  "/staff/paymentcategory/multimerchant": () => <PaymentOps />,
  "/staff/paymentcategory/assign-payment-category": () => <PaymentOps />,
  "/staff/staff-leave-assign": () => <AttendanceOps mode="leaves" />,
  "/staff/staff/rating": () => <CampusOps mode="staff" />,
  "/staff/driver": () => <CampusOps mode="drivers" />,
  "/staff/staff/add": () => <CampusOps mode="staff" />,
  "/staff/my-branch": () => <DashboardPage />,
  "/staff/admin/managebranch": () => <DashboardPage />,
  "/staff/staff/disablestafflist": () => <CampusOps mode="staff" />,
  "/staff/staff/staff-bulk-update": () => <CampusOps mode="staff" />,
  "/staff/teachers-research": () => <CampusOps mode="staff" />,
  "/staff/staff-certificate": () => <CertificateOps mode="staff-id" />,
  "/staff/staff-certificate/staff-generate-certificate": () => (
    <CertificateOps mode="staff-id" />
  ),
  "/staff/teacherlog": () => <CampusOps mode="staff" />,
  "/staff/holiday/staff-week-off": () => <AcademicsHub tab="workingDays" />,
  "/staff/leave-batch-years": () => <AttendanceOps mode="leaves" />,
  "/staff/timetable/mytimetable": () => <AcademicsHub tab="timetable" />,
  "/staff/teacher/assign-class-teacher": () => (
    <AcademicsHub tab="classTeachers" />
  ),
  "/staff/teacher/assign-subject-teacher": () => <AcademicsHub tab="subjects" />,
  "/staff/subjectgroup": () => <AcademicsHub tab="sections" />,
  "/staff/sectionwise-specialization": () => <AcademicsHub tab="programs" />,
  "/staff/sectionwise-specialization/assign-program": () => (
    <AcademicsHub tab="programs" />
  ),
  "/staff/programintake": () => <AcademicsHub tab="programs" />,
  "/staff/batch-settings": () => <AcademicsHub tab="sessions" />,
  "/staff/examgroup/displaymarksexamsubjwise": () => <ExamsPage />,
  "/staff/exam-schedule": () => <ExamsPage />,
  "/staff/examresult/backlog": () => <ExamsOps mode="results" />,
  "/staff/examresult/result-summary": () => <ReportView reportKey="result-summary" />,
  "/staff/examresult/exam-absent": () => <ReportView reportKey="exam-absent" />,
  "/staff/examresult/consolidated": () => (
    <ReportView reportKey="consolidated-performance" />
  ),
  "/staff/admitcard": () => <CertificateOps mode="id-design" />,
  "/staff/examresult/admitcard": () => <CertificateOps mode="id-generate" />,
  "/staff/examgroup/exam-type": () => <ExamsOps mode="grades" />,
  "/staff/examgroup/exam-form": () => <ExamFormOps mode="atkt-apply" />,
  "/staff/exammarksheet/marksheet": () => <EngagementOps mode="reports" />,
  "/staff/exammarksheet": () => <EngagementOps mode="reports" />,
  "/staff/marksheet": () => <ExamsOps mode="results" />,
  "/staff/grade/relative-grade": () => <ExamsOps mode="grades" />,
  "/staff/result-remark": () => <ExamsOps mode="results" />,
  "/staff/marksdivision": () => <ExamsOps mode="grades" />,
  "/staff/papersetting": () => <ExamsPage />,
  "/staff/examgroup/remuneration-setup": () => <PayrollOps mode="report" />,
  "/staff/examgroup/exam-remuneration-bill": () => <PayrollOps mode="report" />,
  "/staff/examgroup/remuneration-hoursetup": () => <PayrollOps mode="report" />,
  "/staff/paper-creation": () => <ExamsPage />,
  "/staff/paper-creation/assign-paper-creation": () => <ExamsPage />,
  "/staff/paper-creation/que-paper-approval-list": () => <ExamsOps mode="block" />,
  "/staff/generalcall": () => <FrontOfficeOps mode="enquiry" />,
  "/staff/dispatch": () => <FrontOfficeOps mode="setup" />,
  "/staff/receive": () => <FrontOfficeOps mode="setup" />,
  "/staff/complaint": () => <FrontOfficeOps mode="enquiry" />,
  "/staff/inward/inward-list": () => <FrontOfficeOps mode="visitors" />,
  "/staff/outward/outward-list": () => <FrontOfficeOps mode="visitors" />,
  "/staff/report/set-front-office-report": () => <FrontOfficeOps mode="enquiry" />,
  "/staff/report/inward-report": () => <FrontOfficeOps mode="visitors" />,
  "/staff/report/outward-report": () => <FrontOfficeOps mode="visitors" />,
  "/staff/report/teacherachievement-report": () => <ReportView reportKey="staff" />,
  "/staff/report/teacheraward-report": () => <ReportView reportKey="staff" />,
  "/staff/report/library": () => <LibraryOps mode="books" />,
  "/staff/library/weedout": () => <LibraryOps mode="weedout" />,
  "/staff/staffpayroll/loans": () => <PayrollOps mode="loans" />,
  "/staff/houses/bulk-assign": () => <CampusOps mode="houses" />,
  "/staff/grade-eligibility": () => <BranchOps mode="eligibility" />,
  "/staff/late-fee-rules": () => <FeesOps mode="fines" />,
  "/staff/discount-types": () => <FeesOps mode="discounts" />,
  "/staff/fees/upload": () => <EngagementOps mode="fees-import" />,
  "/staff/search/people": () => <DirectoryOps mode="search" />,
  "/staff/attendance/day": () => <AttendancePage />,
  "/staff/attendance/modes": () => <BranchOps mode="attendance-modes" />,
  "/staff/messages/policies": () => <BranchOps mode="one-way" />,
  "/staff/broadcast-lists": () => <DirectoryOps mode="contacts" />,
  "/staff/daycare/check-in": () => <DirectoryOps mode="daycare" />,
  "/staff/messages": () => <RequestsOps />,
  "/staff/form-templates": () => <AdmissionFormsOps />,
  "/staff/open-forms": () => <AdmissionFormsOps />,
  "/staff/convert-to-student": () => <AdmissionOps mode="inbox" />,
  "/staff/vehicles": () => <HousingOps mode="vehicles" />,
  "/staff/transport/live": () => <HousingOps mode="gps" />,
  "/staff/transport/trips": () => <HousingOps mode="gps" />,
  "/staff/fuel-logs": () => <HousingOps mode="fuel" />,
  "/staff/transport-slabs": () => <HousingOps mode="slabs" />,
  "/staff/performance": () => <ExamsOps mode="performance" />,
  "/staff/leave-mark-percents": () => <BranchOps mode="leave-marks" />,
  "/staff/report-templates": () => <EngagementOps mode="reports" />,
  "/staff/transport/reports": () => <ReportView reportKey="fuel-logs" />,
  "/staff/routes": () => <HousingOps mode="routes" />,
  "/staff/fees/desk": () => <FeesOps mode="due" />,
  "/staff/store/kits": () => <EngagementOps mode="kits" />,
  "/staff/store/deliveries": () => <EngagementOps mode="deliveries" />,
  "/staff/library/titles": () => <LibraryOps mode="titles" />,
  "/staff/library/accessions": () => <LibraryOps mode="accessions" />,
  "/staff/questionnaires/assign": () => <EngagementOps mode="quizzes" />,
  "/staff/payslips": () => <PayrollOps mode="payslips" />,
  "/staff/library/due": () => <LibraryOps mode="due" />,
  "/staff/library/fines": () => <LibraryOps mode="fines" />,
  "/staff/library/lost": () => <LibraryOps mode="lost" />,
  "/staff/questionnaires/submissions": () => <EngagementOps mode="submissions" />,
  "/staff/pickuppoint/assign": () => <HousingOps mode="routes" />,
  "/staff/route/studenttransportdetails": () => <HousingOps mode="transport-fees" />,
  "/staff/hostel/scan-qrcode": () => <HousingOps mode="assign" />,
  "/staff/hostel/gatepass-list": () => <HousingOps mode="vacancy" />,
  "/staff/roomtype": () => <HousingOps mode="hostels" />,
  "/staff/hostelroom/studenthosteldetails": () => <HousingOps mode="assign" />,
  "/staff/attributes": () => <CampusOps mode="settings" />,
  "/staff/notification/setting": () => <CommsOps mode="reminder" />,
  "/staff/smsconfig": () => <CommsOps mode="sms-template" />,
  "/staff/emailconfig": () => <CampusOps mode="smtp" />,
  "/staff/language": () => <CampusOps mode="settings" />,
  "/staff/currency": () => <CampusOps mode="settings" />,
  "/staff/customfield": () => <CampusOps mode="custom-fields" />,
  "/staff/captcha": () => <CampusOps mode="settings" />,
  "/staff/systemfield": () => <CampusOps mode="settings" />,
  "/staff/admin/filetype": () => <CampusOps mode="settings" />,
  "/staff/sidemenu": () => <UsersPage />,
  "/staff/updater": () => <PhaseBScreen title="System Update" />,
};
