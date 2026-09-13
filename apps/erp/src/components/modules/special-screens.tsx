"use client";

import type { ReactNode } from "react";
import type { ScreenDef } from "@/lib/catalog/screens";
import AcademicsHub from "@/components/modules/academics-hub";
import AttendancePage from "@/app/(staff)/staff/attendance/page";
import DashboardPage from "@/app/(staff)/staff/dashboard/page";
import ExamsPage from "@/app/(staff)/staff/exams/page";
import CollectFeesPage from "@/app/(staff)/staff/fees/collect/page";
import RolesPage from "@/app/(staff)/staff/roles/page";
import CreateStudentPage from "@/app/(staff)/staff/students/create/page";
import StudentsList from "@/components/modules/students-list";
import UsersPage from "@/app/(staff)/staff/users/page";
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
import NaacOps from "@/components/modules/naac-ops";
import CopoOps from "@/components/modules/copo-ops";
import FeedbackOps from "@/components/modules/feedback-ops";
import PayrollOps from "@/components/modules/payroll-ops";
import SeatingOps from "@/components/modules/seating-ops";
import LiveClassOps from "@/components/modules/live-class-ops";
import TenantOps from "@/components/modules/tenant-ops";
import { REMAINING_LIVE } from "@/components/modules/remaining-screens";

const LIVE: Record<string, () => ReactNode> = {
  "/staff/dashboard": () => <DashboardPage />,
  "/staff/admin/dashboard": () => <DashboardPage />,
  "/staff/student/search": () => <StudentsList />,
  "/staff/student/create": () => <CreateStudentPage />,
  "/staff/student/disablestudentslist": () => (
    <StudentsList defaultStatus="DISABLED" />
  ),
  "/staff/student/generaterollnumber": () => <StudentsOps mode="rolls" />,
  "/staff/student/student-bulk-upload": () => <StudentsOps mode="import" />,
  "/staff/category": () => <StudentsOps mode="categories" />,
  "/staff/disable-reason": () => <StudentsOps mode="disableReasons" />,
  "/staff/studentfee": () => <CollectFeesPage />,
  "/staff/studentfee/feesearch": () => <FeesOps mode="due" />,
  "/staff/studentfee/feereceipt": () => <FeesOps mode="receipts" />,
  "/staff/feetype": () => <FeesOps mode="types" />,
  "/staff/feegroup": () => <FeesOps mode="groups" />,
  "/staff/feemaster": () => <FeesOps mode="masters" />,
  "/staff/feemastercoursewise": () => <FeesOps mode="assign" />,
  "/staff/feediscount": () => <FeesOps mode="discounts" />,
  "/staff/fine-rules": () => <FeesOps mode="fines" />,
  "/staff/stuattendence": () => <AttendancePage />,
  "/staff/stuattendence/attendencereport": () => <AttendancePage />,
  "/staff/approve-leave": () => <AttendanceOps mode="approve" />,
  "/staff/staffattendance": () => <AttendanceOps mode="staff" />,
  "/staff/leavetypes": () => <AttendanceOps mode="leaves" />,
  "/staff/leaverequest": () => <AttendanceOps mode="approve" />,
  "/staff/staff/leaverequest": () => <AttendanceOps mode="approve" />,
  "/staff/examgroup": () => <ExamsPage />,
  "/staff/examgroup/mark-entry-single-subject": () => <ExamsPage />,
  "/staff/examgroup/mark-entry-subjectwise": () => <ExamsPage />,
  "/staff/examresult": () => <ExamsOps mode="results" />,
  "/staff/examresult/exam-result-block-unblock": () => <ExamsOps mode="block" />,
  "/staff/examresult/marksheet": () => <ExamsOps mode="results" />,
  "/staff/grade": () => <ExamsOps mode="grades" />,
  "/staff/classes": () => <AcademicsHub tab="classes" />,
  "/staff/sections": () => <AcademicsHub tab="sections" />,
  "/staff/subject": () => <AcademicsHub tab="subjects" />,
  "/staff/sessions": () => <AcademicsHub tab="sessions" />,
  "/staff/department": () => <AcademicsHub tab="department" />,
  "/staff/course-master": () => <AcademicsHub tab="programs" />,
  "/staff/timetable/classreport": () => <AcademicsHub tab="timetable" />,
  "/staff/stdtransfer": () => <AcademicsHub tab="promotion" />,
  "/staff/holiday/set-working-days": () => <AcademicsHub tab="workingDays" />,
  "/staff/users": () => <UsersPage />,
  "/staff/roles": () => <RolesPage />,
  "/staff/staff": () => <CampusOps mode="staff" />,
  "/staff/designation": () => <CampusOps mode="designations" />,
  "/staff/notification": () => <CampusOps mode="notices" />,
  "/staff/schsettings": () => <CampusOps mode="settings" />,
  "/staff/print-headerfooter": () => <CampusOps mode="letterhead" />,
  "/staff/module": () => <CampusOps mode="modules" />,
  "/staff/onlinestudent": () => <AdmissionOps mode="inbox" />,
  "/staff/onlineadmission/admissionsetting": () => (
    <AdmissionOps mode="settings" />
  ),
  "/staff/admission/cutofflist": () => <AdmissionOps mode="cutoff" />,
  "/staff/admission/importapplication": () => <AdmissionOps mode="import" />,
  "/staff/admission/generatemeritlist": () => <AdmissionOps mode="generate" />,
  "/staff/admission/manageadmission": () => <AdmissionOps mode="manage" />,
  "/staff/paymentsettings": () => <PaymentOps />,
  "/staff/hostel": () => <HousingOps mode="hostels" />,
  "/staff/hostelroom": () => <HousingOps mode="rooms" />,
  "/staff/hostel/assign-room": () => <HousingOps mode="assign" />,
  "/staff/hostel/change-room": () => <HousingOps mode="assign" />,
  "/staff/hostel/vacancy-status": () => <HousingOps mode="vacancy" />,
  "/staff/route": () => <HousingOps mode="routes" />,
  "/staff/pickuppoint": () => <HousingOps mode="routes" />,
  "/staff/vehicle": () => <HousingOps mode="vehicles" />,
  "/staff/vehroute": () => <HousingOps mode="vehicles" />,
  "/staff/pickuppoint/student-fees": () => <HousingOps mode="transport-fees" />,
  "/staff/transport/feemaster": () => <HousingOps mode="routes" />,
  "/staff/mailsms/email-template": () => <CommsOps mode="email-template" />,
  "/staff/mailsms/sms-template": () => <CommsOps mode="sms-template" />,
  "/staff/mailsms/compose": () => <CommsOps mode="compose" />,
  "/staff/mailsms/compose-sms": () => <CommsOps mode="compose" />,
  "/staff/mailsms": () => <CommsOps mode="log" />,
  "/staff/mailsms/schedule": () => <CommsOps mode="log" />,
  "/staff/feereminder/setting": () => <CommsOps mode="reminder" />,
  "/staff/studentidcard": () => <CertificateOps mode="id-design" />,
  "/staff/generateidcard/search": () => <CertificateOps mode="id-generate" />,
  "/staff/certificate": () => <CertificateOps mode="cert-design" />,
  "/staff/generatecertificate": () => <CertificateOps mode="cert-generate" />,
  "/staff/staffidcard": () => <CertificateOps mode="staff-id" />,
  "/staff/generatestaffidcard": () => <CertificateOps mode="staff-id" />,
  "/staff/certificate-report": () => <CertificateOps mode="report" />,
  "/staff/enquiry": () => <FrontOfficeOps mode="enquiry" />,
  "/staff/visitors": () => <FrontOfficeOps mode="visitors" />,
  "/staff/visitorspurpose": () => <FrontOfficeOps mode="setup" />,
  "/staff/book/getall": () => <LibraryOps mode="books" />,
  "/staff/member": () => <LibraryOps mode="issue" />,
  "/staff/member/student": () => <LibraryOps mode="student-member" />,
  "/staff/member/teacher": () => <LibraryOps mode="staff-member" />,
  "/staff/atkt-form/admissionsetting": () => <ExamFormOps mode="atkt-settings" />,
  "/staff/revaluation-form/revaluationformsetting": () => (
    <ExamFormOps mode="reval-settings" />
  ),
  "/staff/atkt-form/atkt-form-student": () => <ExamFormOps mode="atkt-apply" />,
  "/staff/atkt-form/edit-atkt-form-student": () => <ExamFormOps mode="atkt-apply" />,
  "/staff/examgroup/revaluation-form": () => <ExamFormOps mode="reval-apply" />,
  "/staff/atkt-form/atkt-form-report": () => <ExamFormOps mode="report" />,
  "/staff/naac/dashboard": () => <NaacOps mode="dashboard" />,
  "/staff/naac": () => <NaacOps mode="tasks" />,
  "/staff/naac/task-allocation": () => <NaacOps mode="allocate" />,
  "/staff/naac/naac-report-master": () => <NaacOps mode="report" />,
  "/staff/naac/naac-report": () => <NaacOps mode="report" />,
  "/staff/copo/program-outcomes": () => <CopoOps mode="po" />,
  "/staff/copo/course-outcomes": () => <CopoOps mode="co" />,
  "/staff/copo/co-po-mapping": () => <CopoOps mode="mapping" />,
  "/staff/copo/indirect-po-mapping": () => <CopoOps mode="indirect" />,
  "/staff/copo/lesson": () => <CopoOps mode="lesson" />,
  "/staff/copo/plan": () => <CopoOps mode="lesson" />,
  "/staff/copo/tlp-approve-list": () => <CopoOps mode="tlp" />,
  "/staff/outcome-basis-education": () => <CopoOps mode="attainment" />,
  "/staff/feedback/feedback-formname-master": () => <FeedbackOps mode="forms" />,
  "/staff/feedback": () => <FeedbackOps mode="fields" />,
  "/staff/feedback/assign-feedback-form": () => <FeedbackOps mode="assign" />,
  "/staff/feedback/showview-feedback-form": () => <FeedbackOps mode="forms" />,
  "/staff/feedback/submitted-forms": () => <FeedbackOps mode="submitted" />,
  "/staff/feedback/fill-feedback-form": () => <FeedbackOps mode="fill" />,
  "/staff/feedbackreport": () => <FeedbackOps mode="report" />,
  "/staff/naac/student-feedback-list": () => <FeedbackOps mode="submitted" />,
  "/staff/naac/student-rating-form": () => <FeedbackOps mode="fill" />,
  "/staff/staffpayroll/add-element": () => <PayrollOps mode="elements" />,
  "/staff/staffpayroll/select-pay-element": () => <PayrollOps mode="structure" />,
  "/staff/staffpayroll/manage-staff-payroll": () => <PayrollOps mode="structure" />,
  "/staff/staffpayroll/staff-payroll": () => <PayrollOps mode="run" />,
  "/staff/staffpayroll/add-income-tax-element": () => <PayrollOps mode="slabs" />,
  "/staff/staffpayroll/generate-income-tax": () => <PayrollOps mode="run" />,
  "/staff/staffpayroll/setup-tax-slab": () => <PayrollOps mode="slabs" />,
  "/staff/staffpayrollreports/staff-payroll": () => <PayrollOps mode="report" />,
  "/staff/seating-arrangement": () => <SeatingOps mode="blocks" />,
  "/staff/seating-arrangement/assign-block": () => <SeatingOps mode="allocate" />,
  "/staff/seating-arrangement/report": () => <SeatingOps mode="report" />,
  "/staff/gmeet/timetable": () => <LiveClassOps mode="gmeet" />,
  "/staff/gmeet/meeting": () => <LiveClassOps mode="gmeet" />,
  "/staff/gmeet/class-report": () => <LiveClassOps mode="gmeet-report" />,
  "/staff/gmeet/meeting-report": () => <LiveClassOps mode="gmeet-report" />,
  "/staff/gmeet": () => <LiveClassOps mode="settings" />,
  "/staff/conference/timetable": () => <LiveClassOps mode="zoom" />,
  "/staff/conference/meeting": () => <LiveClassOps mode="zoom" />,
  "/staff/conference/class-report": () => <LiveClassOps mode="zoom-report" />,
  "/staff/conference/meeting-report": () => <LiveClassOps mode="zoom-report" />,
  "/staff/conference": () => <LiveClassOps mode="settings" />,
  "/staff/multibranch/branch/overview": () => <TenantOps mode="overview" />,
  "/staff/multibranch/finance": () => <TenantOps mode="report" />,
  "/staff/tenants": () => <TenantOps mode="overview" />,
  "/staff/chat": REMAINING_LIVE["/staff/chat"],
  "/staff/report/studentinformation": () => <ReportView reportKey="students" />,
  "/staff/financereports/finance": () => <ReportView reportKey="daily-collection" />,
  "/staff/attendencereports/attendance": () => (
    <ReportView reportKey="attendance-percent" />
  ),
  "/staff/examresult/examinations": () => <ReportView reportKey="exam-results" />,
  "/staff/userlog": () => <ReportView reportKey="user-log" />,
  "/staff/userlog/payment-log": () => <ReportView reportKey="payment-log" />,
  "/staff/audit": () => <ReportView reportKey="audit" />,
  "/staff/report/human-resource": () => <ReportView reportKey="staff" />,
};

export function SpecialScreen({
  href,
  screen,
}: {
  href: string;
  screen: ScreenDef;
}) {
  const render =
    LIVE[href] ??
    LIVE[screen.href] ??
    REMAINING_LIVE[href] ??
    REMAINING_LIVE[screen.href];
  if (!render) return null;
  return (
    <div>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brass)]">
        {screen.module} · live
      </p>
      {render()}
    </div>
  );
}
