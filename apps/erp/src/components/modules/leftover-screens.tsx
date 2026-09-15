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
import CreateStudentPage from "@/app/(staff)/staff/students/create/page";
import PhaseBScreen from "@/components/modules/phase-b";

export const LEFTOVER_LIVE: Record<string, () => ReactNode> = {
  "/staff/admission/dashboard": () => <AdmissionOps mode="inbox" />,
  "/staff/admission/selection-status-report": () => <AdmissionOps mode="manage" />,
  "/staff/admission/summary-report": () => <AdmissionOps mode="manage" />,
  "/staff/admission/report": () => <AdmissionOps mode="manage" />,
  "/staff/student/dashboard": () => <StudentsList />,
  "/staff/student/bulkupdate": () => <StudentsOps mode="import" />,
  "/staff/student/bulkdelete": () => <StudentsList defaultStatus="DISABLED" />,
  "/staff/student/assign-optional-course": () => <StudentsOps mode="rolls" />,
  "/staff/student/semester-allocation": () => <AcademicsHub tab="sections" />,
  "/staff/student/approve-optional-course": () => <StudentsOps mode="rolls" />,
  "/staff/student/upload-student-documents": () => <CreateStudentPage />,
  "/staff/student/upload-student-photo": () => <CreateStudentPage />,
  "/staff/student/assign-seat-number": () => <StudentsOps mode="rolls" />,
  "/staff/student/bulkmail": () => <CommsOps mode="compose" />,
  "/staff/student/profilesetting": () => <CampusOps mode="settings" />,
  "/staff/student-log-update": () => <ReportView reportKey="user-log" />,
  "/staff/stdscholarship": () => <FeesOps mode="discounts" />,
  "/staff/liberal-art/liberal-art-student": () => <CreateStudentPage />,
  "/staff/liberal-art/liberal-art-report": () => <ReportView reportKey="students" />,
  "/staff/liberal-art/admissionsetting": () => <AdmissionOps mode="settings" />,
  "/staff/fee-receipt-import": () => <FeesOps mode="receipts" />,
  "/staff/studentfee/fee-summary-dashboard": () => <CollectFeesPage />,
  "/staff/offlinepayment": () => <FeesOps mode="due" />,
  "/staff/studentfee/searchpayment": () => <FeesOps mode="receipts" />,
  "/staff/assign-variable-fees": () => <FeesOps mode="assign" />,
  "/staff/fees-type-group": () => <FeesOps mode="groups" />,
  "/staff/feesforward": () => <FeesOps mode="masters" />,
  "/staff/paymentcategory/collegeotherfees": () => <FeesOps mode="types" />,
  "/staff/fees-installment": () => <FeesOps mode="masters" />,
  "/staff/paymentcategory": () => <PaymentOps />,
  "/staff/paymentcategory/multimerchant": () => <PaymentOps />,
  "/staff/paymentcategory/assign-payment-category": () => <PaymentOps />,
  "/staff/staff-leave-assign": () => <AttendanceOps mode="leaves" />,
  "/staff/staff/rating": () => <CampusOps mode="staff" />,
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
  "/staff/teacher/assign-class-teacher": () => <AcademicsHub tab="classes" />,
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
  "/staff/admitcard": () => <CertificateOps mode="id-design" />,
  "/staff/examresult/admitcard": () => <CertificateOps mode="id-generate" />,
  "/staff/examgroup/exam-type": () => <ExamsOps mode="grades" />,
  "/staff/examgroup/exam-form": () => <ExamFormOps mode="atkt-apply" />,
  "/staff/exammarksheet/marksheet": () => <ExamsOps mode="results" />,
  "/staff/exammarksheet": () => <ExamsOps mode="results" />,
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
  "/staff/customfield": () => <CampusOps mode="settings" />,
  "/staff/captcha": () => <CampusOps mode="settings" />,
  "/staff/systemfield": () => <CampusOps mode="settings" />,
  "/staff/admin/filetype": () => <CampusOps mode="settings" />,
  "/staff/sidemenu": () => <UsersPage />,
  "/staff/updater": () => <PhaseBScreen title="System Update" />,
};
