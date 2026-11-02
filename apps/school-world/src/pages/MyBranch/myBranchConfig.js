import { ArrowLeft, Users, UserCircle, CalendarDays, Truck, ClipboardList, Star, BookOpen, Building2, MessageCircle, ExternalLink, Upload, Camera, ChartNoAxesColumn } from "lucide-react";
import BirthdaysPage from "./subpages/BirthdaysPage.jsx";
import ManageStaffPage from "./subpages/ManageStaffPage.jsx";
import ManageBusDriversPage from "./subpages/ManageBusDriversPage.jsx";
import ManageStaffCategoryPage from "./subpages/ManageStaffCategoryPage.jsx";
import ManageClassesPage from "./subpages/ManageClassesPage.jsx";
import ManageSubjectCategoriesPage from "./subpages/ManageSubjectCategoriesPage.jsx";
import ManageSubjectTypesPage from "./subpages/ManageSubjectTypesPage.jsx";
import ManageSubjectsPage from "./subpages/ManageSubjectsPage.jsx";
import ManageLeaveMarksPercentagePage from "./subpages/ManageLeaveMarksPercentagePage.jsx";
import ManageAcademicYearPage from "./subpages/ManageAcademicYearPage.jsx";
import ChangeClassPage from "./subpages/ChangeClassPage.jsx";
import PromoteClassPage from "./subpages/PromoteClassPage.jsx";
import PromoteToAlumniPage from "./subpages/PromoteToAlumniPage.jsx";
import ManageHousePage from "./subpages/ManageHousePage.jsx";
import ChangeHousePage from "./subpages/ChangeHousePage.jsx";
import ManageClassEligibilityCriteriaPage from "./subpages/ManageClassEligibilityCriteriaPage.jsx";
import UpdateRollNumbersPage from "./subpages/UpdateRollNumbersPage.jsx";
import OneWayCommunicationPage from "./subpages/OneWayCommunicationPage.jsx";
import ManageExternalLinksPage from "./subpages/ManageExternalLinksPage.jsx";
import BulkStudentParentPhotosPage from "./subpages/BulkStudentParentPhotosPage.jsx";
import ManagePrincipalDetailsPage from "./subpages/ManagePrincipalDetailsPage.jsx";
import ManageBookCentersPage from "./subpages/ManageBookCentersPage.jsx";
import ManageFeeTypesPage from "./subpages/ManageFeeTypesPage.jsx";
import ManageFeeTemplatesPage from "../Templates/FeeStructure/ManageFeeTemplatesPage.jsx";
import AdmitNewStudentPage from "./subpages/AdmitNewStudentPage.jsx";
import ManageDiscountTypesPage from "./subpages/ManageDiscountTypesPage.jsx";
import ManageFeeInstallmentTypesPage from "./subpages/ManageFeeInstallmentTypesPage.jsx";
import BulkFeesUploadPage from "./subpages/BulkFeesUploadPage.jsx";

export const myBranchGroups = [
  {
    title: "Users",
    items: [
      { title: "Manage Parents and Children", description: "View all Parents and their children and reset password.", Icon: Users, action: "manage-parents-and-children" },
      { title: "Admit New Student", description: "Create a new student profile with parent details, fees, day care, transport and immunization records.", Icon: UserCircle, Page: AdmitNewStudentPage },
      { title: "Birthdays", description: "View upcoming and past birthdays of students and teachers.", Icon: CalendarDays, Page: BirthdaysPage },
      { title: "Manage Staff", description: "Add or update staff member details.", Icon: UserCircle, Page: ManageStaffPage },
      { title: "Manage Bus Drivers", description: "Add or update driver details.", Icon: Truck, Page: ManageBusDriversPage },
      { title: "Manage Staff Category", description: "Add new staff category or update existing staff category.", Icon: Users, Page: ManageStaffCategoryPage }
    ]
  },
  {
    title: "Academics",
    items: [
      { title: "Manage Classes", description: "Add new classes or edit existing ones for your branch.", Icon: ClipboardList, Page: ManageClassesPage },
      { title: "Manage Subject Categories", description: "Add new subject or update existing subject category.", Icon: BookOpen, Page: ManageSubjectCategoriesPage },
      { title: "Manage Subject Types", description: "Add new subject or update existing subject types.", Icon: BookOpen, Page: ManageSubjectTypesPage },
      { title: "Manage Subjects", description: "Add or update existing subject details.", Icon: BookOpen, Page: ManageSubjectsPage },
      { title: "Manage Marks Percentage for Leave Type", description: "Define how much percentage of marks can be considered if student is on leave in exam time.", Icon: Star, Page: ManageLeaveMarksPercentagePage },
      { title: "Manage Academic Year", description: "Add or update academic years. Here we set current and next academic years.", Icon: CalendarDays, Page: ManageAcademicYearPage },
      { title: "Change Class", description: "Change student classes.", Icon: Users, Page: ChangeClassPage },
      { title: "Promote Class", description: "Promote students to the next class for next academic year.", Icon: Users, Page: PromoteClassPage },
      { title: "Promote to Alumni", description: "Promote student to Alumni (Disable Student).", Icon: UserCircle, Page: PromoteToAlumniPage },
      { title: "Manage Performance Report Templates", description: "Create and update performance report template and manage terms, subterms and subtests against that template.", Icon: ChartNoAxesColumn, module: "Performance Report" },
      { title: "Manage House", description: "Add new house or edit existing ones for your branch.", Icon: Building2, Page: ManageHousePage },
      { title: "Change House", description: "Change Student's House.", Icon: Building2, Page: ChangeHousePage },
      { title: "Manage Class Eligibility Criteria", description: "Set eligibility criteria for grade like eligible range of student birthdates.", Icon: ClipboardList, Page: ManageClassEligibilityCriteriaPage },
      { title: "Update Roll Numbers", description: "Add roll numbers or update existing one.", Icon: ClipboardList, Page: UpdateRollNumbersPage }
    ]
  },
  {
    title: "Administrative",
    items: [
      { title: "Messages", description: "View all messages received and sent by school staff.", Icon: MessageCircle, module: "Messages" },
      { title: "One Way Communication", description: "Choose which staff roles parents are not allowed to message.", Icon: MessageCircle, Page: OneWayCommunicationPage },
      { title: "Manage Routes", description: "Add bus routes or edit existing ones for your branch.", Icon: Truck, module: "Transport" },
      { title: "Manage Fee Types", description: "Add and update fee types, refund settings and GST applicability.", Icon: ClipboardList, Page: ManageFeeTypesPage },
      { title: "Manage Discount Types", description: "Add and update discount types.", Icon: ClipboardList, Page: ManageDiscountTypesPage },
      { title: "Manage Fee Templates", description: "Create fee schedules, manage installments and apply templates to students.", Icon: ClipboardList, Page: ManageFeeTemplatesPage },
      { title: "Manage External Links", description: "Add school specific links or update existing links or its details.", Icon: ExternalLink, Page: ManageExternalLinksPage },
      { title: "Bulk Fees Upload", description: "Upload student fees in bulk for selected academic year and class.", Icon: Upload, Page: BulkFeesUploadPage },
      { title: "Upload student and parent photos in bulk", description: "Bulk Student Data Update through import export.", Icon: Camera, Page: BulkStudentParentPhotosPage },
      { title: "Manage Attendance Mode Types", description: "Add and update attendance mode types.", Icon: Star, module: "Attendance" },
      { title: "Manage Principal Details", description: "Assign grades to Principal and add Principal signature.", Icon: UserCircle, Page: ManagePrincipalDetailsPage },
      { title: "Manage Fee Installment Types", description: "Add or update fee installments.", Icon: ClipboardList, Page: ManageFeeInstallmentTypesPage },
      { title: "Manage Book Centers", description: "Add or update library center.", Icon: BookOpen, Page: ManageBookCentersPage }
    ]
  }
];
