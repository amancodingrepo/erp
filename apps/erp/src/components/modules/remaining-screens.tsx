"use client";

import type { ReactNode } from "react";
import RemainingOps, { ChatOps } from "./remaining-ops";

function ops(
  title: string,
  collection: string,
  fields: Array<{
    name: string;
    placeholder?: string;
    type?: string;
    required?: boolean;
    optionsPath?: string;
    optionLabel?: string;
  }>,
) {
  function OpsPanel() {
    return (
      <RemainingOps title={title} collection={collection} fields={fields} />
    );
  }
  OpsPanel.displayName = `Ops:${collection}`;
  return OpsPanel;
}

const students = {
  optionsPath: "/api/v1/students?pageSize=100",
  optionLabel: "name",
};
const staff = { optionsPath: "/api/v1/staff", optionLabel: "firstName" };

export const REMAINING_LIVE: Record<string, () => ReactNode> = {
  "/staff/canteen/getall-canteen": ops("Canteen master", "canteen-outlets", [
    { name: "name", placeholder: "Outlet name", required: true },
    { name: "code", placeholder: "Code" },
  ]),
  "/staff/canteen/getall-breaktype": ops("Menu types", "canteen-types", [
    { name: "name", placeholder: "Breakfast / Lunch", required: true },
  ]),
  "/staff/canteen/getall-food-item": ops("Food items", "canteen-items", [
    { name: "name", placeholder: "Item", required: true },
    { name: "price", placeholder: "Price", type: "number", required: true },
  ]),
  "/staff/canteen/menu-list": ops("Menus", "canteen-menus", [
    { name: "name", placeholder: "Menu name", required: true },
    { name: "outletId", placeholder: "Outlet", required: true, optionsPath: "/api/v1/ops/canteen-outlets" },
    { name: "servedOn", type: "date" },
  ]),
  "/staff/canteen/assign-menu": ops("Assign menu", "canteen-menus", [
    { name: "name", placeholder: "Assignment name", required: true },
    { name: "outletId", required: true, optionsPath: "/api/v1/ops/canteen-outlets" },
  ]),
  "/staff/canteen/create-coupon": ops("Coupons", "canteen-coupons", [
    { name: "code", placeholder: "Code", required: true },
    { name: "amount", placeholder: "Amount", type: "number", required: true },
    { name: "studentId", ...students },
  ]),
  "/staff/canteen/canteen-auditor": ops("Redeem coupon", "canteen-coupons", [
    { name: "code", placeholder: "Coupon code", required: true },
    { name: "redeem", placeholder: "type yes then ignore — use redeem=true via API" },
  ]),
  "/staff/railway-concession": ops("Railway concession", "railway-concessions", [
    { name: "studentId", required: true, ...students },
    { name: "fromStation", placeholder: "From", required: true },
    { name: "toStation", placeholder: "To", required: true },
    { name: "className", placeholder: "SECOND" },
  ]),
  "/staff/report/railway-concession-report": ops(
    "Railway concession report",
    "railway-concessions",
    [{ name: "studentId", required: true, ...students }, { name: "fromStation", required: true }, { name: "toStation", required: true }],
  ),
  "/staff/onlinecourse/coursecategory/categoryadd": ops("Course categories", "lms-categories", [
    { name: "name", required: true },
  ]),
  "/staff/onlinecourse/course": ops("Online courses", "lms-courses", [
    { name: "title", required: true },
    { name: "price", type: "number" },
    { name: "categoryId", optionsPath: "/api/v1/ops/lms-categories" },
  ]),
  "/staff/onlinecourse/course/setting": ops("Course settings", "lms-courses", [
    { name: "title", required: true },
  ]),
  "/staff/onlinecourse/offlinepayment/payment": ops("Course payments", "lms-enrollments", [
    { name: "courseId", required: true, optionsPath: "/api/v1/ops/lms-courses", optionLabel: "title" },
    { name: "studentId", required: true, ...students },
  ]),
  "/staff/onlinecourse/coursereport/report": ops("Course report", "lms-enrollments", [
    { name: "courseId", required: true, optionsPath: "/api/v1/ops/lms-courses", optionLabel: "title" },
    { name: "studentId", required: true, ...students },
  ]),
  "/staff/onlinecourse/courseexamquestion": ops("Course questions", "lms-questions", [
    { name: "courseId", required: true, optionsPath: "/api/v1/ops/lms-courses", optionLabel: "title" },
    { name: "body", placeholder: "Question", required: true },
    { name: "answer", placeholder: "Correct option", required: true },
  ]),
  "/staff/onlineexam": ops("Online exams", "cbt-exams", [
    { name: "title", required: true },
    { name: "durationMin", type: "number" },
  ]),
  "/staff/question": ops("Question bank", "cbt-questions", [
    { name: "examId", required: true, optionsPath: "/api/v1/ops/cbt-exams", optionLabel: "title" },
    { name: "body", required: true },
    { name: "answer", required: true },
  ]),
  "/staff/onlineexam/report": ops("Online exam report", "cbt-attempts", [
    { name: "examId", required: true, optionsPath: "/api/v1/ops/cbt-exams", optionLabel: "title" },
    { name: "studentId", required: true, ...students },
  ]),
  "/staff/hr-recruitment": ops("Recruitment", "jobs", [
    { name: "title", required: true },
    { name: "department" },
  ]),
  "/staff/itemcategory": ops("Item categories", "item-categories", [{ name: "name", required: true }]),
  "/staff/itemstore": ops("Stores", "item-stores", [{ name: "name", required: true }]),
  "/staff/itemsupplier": ops("Suppliers", "item-suppliers", [
    { name: "name", required: true },
    { name: "phone" },
  ]),
  "/staff/item": ops("Items", "items", [
    { name: "name", required: true },
    { name: "unit" },
    { name: "categoryId", optionsPath: "/api/v1/ops/item-categories" },
  ]),
  "/staff/itemstock": ops("Add stock", "item-stock", [
    { name: "itemId", required: true, optionsPath: "/api/v1/ops/items" },
    { name: "storeId", required: true, optionsPath: "/api/v1/ops/item-stores" },
    { name: "qty", type: "number", required: true },
  ]),
  "/staff/issueitem": ops("Issue item", "item-issues", [
    { name: "itemId", required: true, optionsPath: "/api/v1/ops/items" },
    { name: "storeId", required: true, optionsPath: "/api/v1/ops/item-stores" },
    { name: "qty", type: "number", required: true },
    { name: "studentId", ...students },
  ]),
  "/staff/report/inventory": ops("Inventory", "items", [{ name: "name", required: true }]),
  "/staff/requisitions": ops("Support topics", "support-topics", [{ name: "name", required: true }]),
  "/staff/requisitions/load-requisition-list": ops("Support tickets", "support-tickets", [
    { name: "topicId", required: true, optionsPath: "/api/v1/ops/support-topics" },
    { name: "title", required: true },
    { name: "body" },
  ]),
  "/staff/chat": () => <ChatOps />,
  "/staff/alumni/alumnilist": ops("Alumni", "alumni", [
    { name: "name", required: true },
    { name: "year" },
    { name: "email" },
  ]),
  "/staff/alumni/events": ops("Alumni events", "alumni-events", [
    { name: "title", required: true },
    { name: "heldOn", type: "date" },
    { name: "venue" },
  ]),
  "/staff/report/alumnireport": ops("Alumni report", "alumni", [{ name: "name", required: true }]),
  "/staff/assign-mentor": ops("Assign mentor", "mentors", [
    { name: "staffId", required: true, ...staff },
    { name: "studentId", required: true, ...students },
  ]),
  "/staff/assign-mentor/project-approval-list": ops("Projects", "mentor-projects", [
    { name: "studentId", required: true, ...students },
    { name: "title", required: true },
    { name: "kind", placeholder: "PROJECT" },
  ]),
  "/staff/assign-mentor/ojt-approval-list": ops("OJT", "mentor-projects", [
    { name: "studentId", required: true, ...students },
    { name: "title", required: true },
    { name: "kind", placeholder: "OJT" },
  ]),
  "/staff/assign-mentor/project-chapter-list": ops("Project chapters", "mentor-projects", [
    { name: "studentId", required: true, ...students },
    { name: "title", required: true },
    { name: "chapter" },
  ]),
  "/staff/assign-mentor/ojt-details": ops("OJT details", "mentor-projects", [
    { name: "studentId", required: true, ...students },
    { name: "title", required: true },
    { name: "kind", placeholder: "OJT" },
  ]),
  "/staff/front/page": ops("Pages", "cms-pages", [
    { name: "slug", required: true },
    { name: "title", required: true },
    { name: "body", required: true },
    { name: "kind", placeholder: "page" },
  ]),
  "/staff/front/notice": ops("News", "cms-pages", [
    { name: "slug", required: true },
    { name: "title", required: true },
    { name: "body", required: true },
    { name: "kind", placeholder: "news" },
  ]),
  "/staff/front/events": ops("Events", "cms-pages", [
    { name: "slug", required: true },
    { name: "title", required: true },
    { name: "body", required: true },
    { name: "kind", placeholder: "event" },
  ]),
  "/staff/front/gallery": ops("Gallery", "cms-pages", [
    { name: "slug", required: true },
    { name: "title", required: true },
    { name: "body", required: true },
    { name: "kind", placeholder: "gallery" },
  ]),
  "/staff/front/banner": ops("Banners", "cms-pages", [
    { name: "slug", required: true },
    { name: "title", required: true },
    { name: "body", required: true },
    { name: "kind", placeholder: "banner" },
  ]),
  "/staff/front/media": ops("Media", "cms-pages", [
    { name: "slug", required: true },
    { name: "title", required: true },
    { name: "body", required: true },
    { name: "kind", placeholder: "media" },
  ]),
  "/staff/front/menus": ops("Menus", "cms-pages", [
    { name: "slug", required: true },
    { name: "title", required: true },
    { name: "body", required: true },
    { name: "kind", placeholder: "menu" },
  ]),
  "/staff/frontcms": ops("CMS settings", "cms-pages", [
    { name: "slug", required: true },
    { name: "title", required: true },
    { name: "body", required: true },
  ]),
  "/staff/incomehead": ops("Income heads", "finance-heads", [
    { name: "name", required: true },
    { name: "kind", placeholder: "INCOME" },
  ]),
  "/staff/expensehead": ops("Expense heads", "finance-heads", [
    { name: "name", required: true },
    { name: "kind", placeholder: "EXPENSE" },
  ]),
  "/staff/income": ops("Income", "finance-entries", [
    { name: "headId", required: true, optionsPath: "/api/v1/ops/finance-heads" },
    { name: "amount", type: "number", required: true },
    { name: "entryOn", type: "date", required: true },
    { name: "description" },
  ]),
  "/staff/income/incomesearch": ops("Search income", "finance-entries", [
    { name: "headId", required: true, optionsPath: "/api/v1/ops/finance-heads" },
    { name: "amount", type: "number", required: true },
    { name: "entryOn", type: "date", required: true },
  ]),
  "/staff/expense": ops("Expense", "finance-entries", [
    { name: "headId", required: true, optionsPath: "/api/v1/ops/finance-heads" },
    { name: "amount", type: "number", required: true },
    { name: "entryOn", type: "date", required: true },
    { name: "description" },
  ]),
  "/staff/expense/expensesearch": ops("Search expense", "finance-entries", [
    { name: "headId", required: true, optionsPath: "/api/v1/ops/finance-heads" },
    { name: "amount", type: "number", required: true },
    { name: "entryOn", type: "date", required: true },
  ]),
  "/staff/tnp/tnp-company-list": ops("Companies", "tnp-companies", [
    { name: "name", required: true },
    { name: "sector" },
    { name: "contact" },
  ]),
  "/staff/tnp": ops("Placement drives", "tnp-drives", [
    { name: "companyId", required: true, optionsPath: "/api/v1/ops/tnp-companies" },
    { name: "title", required: true },
    { name: "heldOn", type: "date" },
  ]),
  "/staff/resume": ops("Build CV", "resumes", [
    { name: "studentId", required: true, ...students },
    { name: "headline", required: true },
    { name: "body", required: true },
  ]),
  "/staff/resume/download": ops("CVs", "resumes", [
    { name: "studentId", required: true, ...students },
    { name: "headline", required: true },
    { name: "body", required: true },
  ]),
  "/staff/flowmaster/add-event": ops("Add activity", "activities", [
    { name: "title", required: true },
    { name: "heldOn", type: "date" },
    { name: "venue" },
  ]),
  "/staff/flowmaster/event-list": ops("Activities", "activities", [
    { name: "title", required: true },
  ]),
  "/staff/report/flowmaster-report": ops("Activity report", "activities", [
    { name: "title", required: true },
  ]),
  "/staff/lessonplan/lesson": ops("Lessons", "lesson-plans", [
    { name: "title", required: true },
    { name: "topic" },
    { name: "body" },
  ]),
  "/staff/lessonplan/topic": ops("Topics", "lesson-plans", [
    { name: "title", required: true },
    { name: "topic", required: true },
  ]),
  "/staff/lessonplan/instruction-plan": ops("Instruction plan", "lesson-plans", [
    { name: "title", required: true },
    { name: "body" },
  ]),
  "/staff/lessonplan/copylesson": ops("Copy lessons", "lesson-plans", [
    { name: "title", required: true },
  ]),
  "/staff/syllabus": ops("Syllabus", "lesson-plans", [{ name: "title", required: true }]),
  "/staff/syllabus/status": ops("Syllabus status", "lesson-plans", [
    { name: "title", required: true },
  ]),
  "/staff/report/lesson-plan": ops("Lesson plan report", "lesson-plans", [
    { name: "title", required: true },
  ]),
  "/staff/homework": ops("Assignments", "homework", [
    { name: "title", required: true },
    { name: "classId", required: true, optionsPath: "/api/v1/classes" },
    { name: "sectionId", required: true, optionsPath: "/api/v1/sections" },
    { name: "assignedOn", type: "date", required: true },
    { name: "dueOn", type: "date", required: true },
  ]),
  "/staff/contenttype": ops("Content types", "download-types", [
    { name: "name", required: true },
  ]),
  "/staff/content/upload": ops("Upload content", "contents", [
    { name: "title", required: true },
    { name: "url", required: true },
    { name: "typeId", optionsPath: "/api/v1/ops/download-types" },
  ]),
  "/staff/content/list": ops("Shared content", "contents", [
    { name: "title", required: true },
    { name: "url", required: true },
  ]),
  "/staff/video-tutorial": ops("Video tutorials", "contents", [
    { name: "title", required: true },
    { name: "url", placeholder: "https://", required: true },
  ]),
  "/staff/roombooking/roombook": ops("Rooms", "rooms", [
    { name: "name", required: true },
    { name: "capacity", type: "number" },
  ]),
  "/staff/roombooking/roombook/roombookrequest": ops("Book room", "room-bookings", [
    { name: "roomId", required: true, optionsPath: "/api/v1/ops/rooms" },
    { name: "title", required: true },
    { name: "startAt", type: "datetime-local", required: true },
    { name: "endAt", type: "datetime-local", required: true },
  ]),
  "/staff/roombooking/roombook/roombookrequestlist": ops("Booking list", "room-bookings", [
    { name: "roomId", required: true, optionsPath: "/api/v1/ops/rooms" },
    { name: "title", required: true },
    { name: "startAt", type: "datetime-local", required: true },
    { name: "endAt", type: "datetime-local", required: true },
  ]),
  "/staff/staffpayroll/visiting-staff-payroll": ops("Visiting payroll note", "finance-entries", [
    { name: "headId", required: true, optionsPath: "/api/v1/ops/finance-heads" },
    { name: "amount", type: "number", required: true },
    { name: "entryOn", type: "date", required: true },
    { name: "description", placeholder: "Visiting staff" },
  ]),
};
