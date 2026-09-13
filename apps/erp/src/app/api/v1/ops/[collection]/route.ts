import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  addStock,
  enrollCourse,
  issueStock,
  postChat,
  redeemCoupon,
  submitCbt,
} from "@/lib/services/remaining";

const opt = z.string().min(1).optional();

type Handler = {
  perm: [string, string, string];
  list: (campusId: string) => Promise<unknown>;
  create: (campusId: string, userId: string, body: unknown) => Promise<unknown>;
};

function str(v: unknown) {
  return String(v ?? "").trim();
}

const HANDLERS: Record<string, Handler> = {
  "canteen-outlets": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.canteenOutlet.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z.object({ name: z.string().min(1), code: opt }).parse(raw);
      return prisma.canteenOutlet.create({ data: { campusId, name: b.name, code: b.code } });
    },
  },
  "canteen-types": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.canteenMenuType.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z.object({ name: z.string().min(1) }).parse(raw);
      return prisma.canteenMenuType.create({ data: { campusId, name: b.name } });
    },
  },
  "canteen-items": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.canteenFoodItem.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ name: z.string().min(1), price: z.union([z.number(), z.string()]).optional() })
        .parse(raw);
      return prisma.canteenFoodItem.create({
        data: { campusId, name: b.name, price: b.price ?? 0 },
      });
    },
  },
  "canteen-menus": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.canteenMenu.findMany({
        where: { campusId },
        include: { outlet: true, menuType: true },
        orderBy: { name: "asc" },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          outletId: z.string().min(1),
          menuTypeId: opt,
          name: z.string().min(1),
          servedOn: opt,
          itemIds: z.array(z.string()).optional(),
        })
        .parse(raw);
      return prisma.canteenMenu.create({
        data: {
          campusId,
          outletId: b.outletId,
          menuTypeId: b.menuTypeId,
          name: b.name,
          servedOn: b.servedOn ? new Date(b.servedOn) : null,
          itemIds: b.itemIds ?? [],
        },
      });
    },
  },
  "canteen-coupons": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.canteenCoupon.findMany({
        where: { campusId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          code: z.string().min(2),
          amount: z.union([z.number(), z.string()]).optional(),
          studentId: opt,
          outletId: opt,
          redeem: z.boolean().optional(),
        })
        .parse(raw);
      const code = b.code.trim().toUpperCase();
      if (b.redeem) return redeemCoupon(campusId, code);
      const existing = await prisma.canteenCoupon.findFirst({
        where: { campusId, code },
      });
      if (existing) return redeemCoupon(campusId, code);
      return prisma.canteenCoupon.create({
        data: {
          campusId,
          code,
          amount: b.amount ?? 0,
          studentId: b.studentId,
          outletId: b.outletId,
        },
      });
    },
  },
  "railway-concessions": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.railwayConcession.findMany({
        where: { campusId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          studentId: z.string().min(1),
          fromStation: z.string().min(1),
          toStation: z.string().min(1),
          className: opt,
          periodFrom: opt,
          periodTo: opt,
          status: opt,
        })
        .parse(raw);
      return prisma.railwayConcession.create({
        data: {
          campusId,
          studentId: b.studentId,
          fromStation: b.fromStation,
          toStation: b.toStation,
          className: b.className ?? "SECOND",
          periodFrom: b.periodFrom ? new Date(b.periodFrom) : null,
          periodTo: b.periodTo ? new Date(b.periodTo) : null,
          status: b.status ?? "PENDING",
        },
      });
    },
  },
  "lms-categories": {
    perm: ["academics", "class", "view"],
    list: (campusId) =>
      prisma.lmsCategory.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z.object({ name: z.string().min(1) }).parse(raw);
      return prisma.lmsCategory.create({ data: { campusId, name: b.name } });
    },
  },
  "lms-courses": {
    perm: ["academics", "class", "view"],
    list: (campusId) =>
      prisma.lmsCourse.findMany({
        where: { campusId },
        include: { category: true, _count: { select: { enrollments: true } } },
        orderBy: { title: "asc" },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          title: z.string().min(1),
          categoryId: opt,
          price: z.union([z.number(), z.string()]).optional(),
        })
        .parse(raw);
      return prisma.lmsCourse.create({
        data: {
          campusId,
          title: b.title,
          categoryId: b.categoryId,
          price: b.price ?? 0,
        },
      });
    },
  },
  "lms-enrollments": {
    perm: ["academics", "class", "view"],
    list: (campusId) =>
      prisma.lmsEnrollment.findMany({
        where: { course: { campusId } },
        include: { course: true },
        take: 200,
        orderBy: { createdAt: "desc" },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          courseId: z.string().min(1),
          studentId: z.string().min(1),
          paid: z.boolean().optional(),
        })
        .parse(raw);
      return enrollCourse({ campusId, ...b });
    },
  },
  "lms-questions": {
    perm: ["academics", "class", "view"],
    list: (campusId) =>
      prisma.lmsQuestion.findMany({
        where: { course: { campusId } },
        include: { course: true },
        take: 200,
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          courseId: z.string().min(1),
          body: z.string().min(1),
          options: z.array(z.string()).optional(),
          answer: z.string().min(1),
        })
        .parse(raw);
      const course = await prisma.lmsCourse.findFirst({
        where: { id: b.courseId, campusId },
      });
      if (!course) throw notFound("course");
      return prisma.lmsQuestion.create({
        data: {
          courseId: b.courseId,
          body: b.body,
          options: b.options ?? ["Yes", "No"],
          answer: b.answer,
        },
      });
    },
  },
  "cbt-exams": {
    perm: ["exams", "group", "view"],
    list: (campusId) =>
      prisma.onlineExamBank.findMany({
        where: { campusId },
        include: { _count: { select: { questions: true, attempts: true } } },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ title: z.string().min(1), durationMin: z.number().int().optional() })
        .parse(raw);
      return prisma.onlineExamBank.create({
        data: { campusId, title: b.title, durationMin: b.durationMin ?? 60 },
      });
    },
  },
  "cbt-questions": {
    perm: ["exams", "group", "view"],
    list: (campusId) =>
      prisma.onlineExamQuestion.findMany({
        where: { exam: { campusId } },
        include: { exam: true },
        take: 200,
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          examId: z.string().min(1),
          body: z.string().min(1),
          options: z.array(z.string()).optional(),
          answer: z.string().min(1),
          marks: z.number().int().optional(),
        })
        .parse(raw);
      const exam = await prisma.onlineExamBank.findFirst({
        where: { id: b.examId, campusId },
      });
      if (!exam) throw notFound("exam");
      return prisma.onlineExamQuestion.create({
        data: {
          examId: b.examId,
          body: b.body,
          options: b.options ?? ["A", "B", "C", "D"],
          answer: b.answer,
          marks: b.marks ?? 1,
        },
      });
    },
  },
  "cbt-attempts": {
    perm: ["exams", "marks", "view"],
    list: (campusId) =>
      prisma.onlineExamAttempt.findMany({
        where: { exam: { campusId } },
        include: { exam: true },
        take: 200,
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          examId: z.string().min(1),
          studentId: z.string().min(1),
          answers: z.record(z.string(), z.string()),
        })
        .parse(raw);
      return submitCbt({ campusId, ...b });
    },
  },
  jobs: {
    perm: ["hr", "staff", "view"],
    list: (campusId) =>
      prisma.jobPosting.findMany({
        where: { campusId },
        include: { _count: { select: { applicants: true } } },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ title: z.string().min(1), department: opt, closesOn: opt })
        .parse(raw);
      return prisma.jobPosting.create({
        data: {
          campusId,
          title: b.title,
          department: b.department,
          closesOn: b.closesOn ? new Date(b.closesOn) : null,
        },
      });
    },
  },
  "job-applicants": {
    perm: ["hr", "staff", "view"],
    list: (campusId) =>
      prisma.jobApplicant.findMany({
        where: { job: { campusId } },
        include: { job: true },
        take: 200,
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          jobId: z.string().min(1),
          name: z.string().min(1),
          email: opt,
          phone: opt,
        })
        .parse(raw);
      const job = await prisma.jobPosting.findFirst({
        where: { id: b.jobId, campusId },
      });
      if (!job) throw notFound("job");
      return prisma.jobApplicant.create({ data: b });
    },
  },
  "item-categories": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.itemCategory.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z.object({ name: z.string().min(1) }).parse(raw);
      return prisma.itemCategory.create({ data: { campusId, name: b.name } });
    },
  },
  "item-stores": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.itemStore.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z.object({ name: z.string().min(1) }).parse(raw);
      return prisma.itemStore.create({ data: { campusId, name: b.name } });
    },
  },
  "item-suppliers": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.itemSupplier.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z.object({ name: z.string().min(1), phone: opt }).parse(raw);
      return prisma.itemSupplier.create({ data: { campusId, name: b.name, phone: b.phone } });
    },
  },
  items: {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.inventoryItem.findMany({
        where: { campusId },
        include: { category: true, stocks: true },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ name: z.string().min(1), categoryId: opt, unit: opt })
        .parse(raw);
      return prisma.inventoryItem.create({
        data: {
          campusId,
          name: b.name,
          categoryId: b.categoryId,
          unit: b.unit ?? "pcs",
        },
      });
    },
  },
  "item-stock": {
    perm: ["students", "profile", "edit"],
    list: (campusId) =>
      prisma.itemStock.findMany({
        where: { item: { campusId } },
        include: { item: true, store: true },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          itemId: z.string().min(1),
          storeId: z.string().min(1),
          qty: z.number().int(),
          note: opt,
        })
        .parse(raw);
      return addStock({ campusId, ...b });
    },
  },
  "item-issues": {
    perm: ["students", "profile", "edit"],
    list: (campusId) =>
      prisma.itemIssue.findMany({
        where: { item: { campusId } },
        include: { item: true },
        orderBy: { issuedAt: "desc" },
        take: 200,
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          itemId: z.string().min(1),
          storeId: z.string().min(1),
          qty: z.number().int(),
          studentId: opt,
          staffId: opt,
        })
        .parse(raw);
      return issueStock({ campusId, ...b });
    },
  },
  "support-topics": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.supportTopic.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z.object({ name: z.string().min(1) }).parse(raw);
      return prisma.supportTopic.create({ data: { campusId, name: b.name } });
    },
  },
  "support-tickets": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.supportTicket.findMany({
        where: { topic: { campusId } },
        include: { topic: true },
        orderBy: { createdAt: "desc" },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          topicId: z.string().min(1),
          title: z.string().min(1),
          body: opt,
          studentId: opt,
        })
        .parse(raw);
      const topic = await prisma.supportTopic.findFirst({
        where: { id: b.topicId, campusId },
      });
      if (!topic) throw notFound("topic");
      return prisma.supportTicket.create({ data: b });
    },
  },
  "chat-threads": {
    perm: ["communicate", "notice", "view"],
    list: (campusId) =>
      prisma.chatThread.findMany({
        where: { campusId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
        orderBy: { createdAt: "desc" },
      }),
    create: async (campusId, userId, raw) => {
      const b = z
        .object({
          title: opt,
          body: z.string().min(1),
          threadId: opt,
          studentId: opt,
        })
        .parse(raw);
      return postChat({ campusId, userId, ...b });
    },
  },
  alumni: {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.alumnus.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          name: z.string().min(1),
          year: opt,
          email: opt,
          phone: opt,
          studentId: opt,
        })
        .parse(raw);
      return prisma.alumnus.create({ data: { campusId, ...b } });
    },
  },
  "alumni-events": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.alumniEvent.findMany({ where: { campusId }, orderBy: { title: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ title: z.string().min(1), heldOn: opt, venue: opt })
        .parse(raw);
      return prisma.alumniEvent.create({
        data: {
          campusId,
          title: b.title,
          heldOn: b.heldOn ? new Date(b.heldOn) : null,
          venue: b.venue,
        },
      });
    },
  },
  mentors: {
    perm: ["hr", "staff", "view"],
    list: (campusId) =>
      prisma.mentorAssignment.findMany({ where: { campusId } }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ staffId: z.string().min(1), studentId: z.string().min(1) })
        .parse(raw);
      return prisma.mentorAssignment.create({ data: { campusId, ...b } });
    },
  },
  "mentor-projects": {
    perm: ["hr", "staff", "view"],
    list: (campusId) =>
      prisma.mentorProject.findMany({ where: { campusId } }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          studentId: z.string().min(1),
          title: z.string().min(1),
          staffId: opt,
          kind: opt,
          status: opt,
          chapter: opt,
        })
        .parse(raw);
      return prisma.mentorProject.create({
        data: {
          campusId,
          studentId: b.studentId,
          title: b.title,
          staffId: b.staffId,
          kind: b.kind ?? "PROJECT",
          status: b.status ?? "PENDING",
          chapter: b.chapter,
        },
      });
    },
  },
  "cms-pages": {
    perm: ["communicate", "notice", "view"],
    list: (campusId) =>
      prisma.cmsPage.findMany({ where: { campusId }, orderBy: { title: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          slug: z.string().min(1),
          title: z.string().min(1),
          body: z.string().min(1),
          kind: opt,
        })
        .parse(raw);
      return prisma.cmsPage.create({
        data: {
          campusId,
          slug: b.slug,
          title: b.title,
          body: b.body,
          kind: b.kind ?? "page",
        },
      });
    },
  },
  "finance-heads": {
    perm: ["fees", "master", "view"],
    list: (campusId) =>
      prisma.financeHead.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ name: z.string().min(1), kind: z.string().optional() })
        .parse(raw);
      const kind =
        (b.kind ?? "INCOME").toUpperCase() === "EXPENSE" ? "EXPENSE" : "INCOME";
      return prisma.financeHead.create({ data: { campusId, name: b.name, kind } });
    },
  },
  "finance-entries": {
    perm: ["fees", "master", "view"],
    list: (campusId) =>
      prisma.financeEntry.findMany({
        where: { head: { campusId } },
        include: { head: true },
        take: 200,
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          headId: z.string().min(1),
          amount: z.union([z.number(), z.string()]),
          entryOn: z.string().min(1),
          description: opt,
        })
        .parse(raw);
      const head = await prisma.financeHead.findFirst({
        where: { id: b.headId, campusId },
      });
      if (!head) throw notFound("head");
      return prisma.financeEntry.create({
        data: {
          headId: b.headId,
          amount: b.amount,
          entryOn: new Date(b.entryOn),
          description: b.description,
        },
      });
    },
  },
  "tnp-companies": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.tnpCompany.findMany({
        where: { campusId },
        include: { drives: true },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ name: z.string().min(1), sector: opt, contact: opt })
        .parse(raw);
      return prisma.tnpCompany.create({ data: { campusId, ...b } });
    },
  },
  "tnp-drives": {
    perm: ["students", "profile", "view"],
    list: (campusId) =>
      prisma.tnpDrive.findMany({
        where: { company: { campusId } },
        include: { company: true },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ companyId: z.string().min(1), title: z.string().min(1), heldOn: opt })
        .parse(raw);
      const company = await prisma.tnpCompany.findFirst({
        where: { id: b.companyId, campusId },
      });
      if (!company) throw notFound("company");
      return prisma.tnpDrive.create({
        data: {
          companyId: b.companyId,
          title: b.title,
          heldOn: b.heldOn ? new Date(b.heldOn) : null,
        },
      });
    },
  },
  resumes: {
    perm: ["students", "profile", "view"],
    list: (campusId) => prisma.studentResume.findMany({ where: { campusId } }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          studentId: z.string().min(1),
          headline: z.string().min(1),
          body: z.string().min(1),
        })
        .parse(raw);
      return prisma.studentResume.upsert({
        where: {
          campusId_studentId: { campusId, studentId: b.studentId },
        },
        update: { headline: b.headline, body: b.body },
        create: { campusId, ...b },
      });
    },
  },
  activities: {
    perm: ["communicate", "notice", "view"],
    list: (campusId) =>
      prisma.activityEvent.findMany({ where: { campusId }, orderBy: { title: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ title: z.string().min(1), heldOn: opt, venue: opt, notes: opt })
        .parse(raw);
      return prisma.activityEvent.create({
        data: {
          campusId,
          title: b.title,
          heldOn: b.heldOn ? new Date(b.heldOn) : null,
          venue: b.venue,
          notes: b.notes,
        },
      });
    },
  },
  "lesson-plans": {
    perm: ["academics", "class", "view"],
    list: (campusId) =>
      prisma.lessonPlan.findMany({ where: { campusId }, orderBy: { title: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          title: z.string().min(1),
          topic: opt,
          body: opt,
          classId: opt,
          subjectId: opt,
          weekNo: z.number().int().optional(),
        })
        .parse(raw);
      return prisma.lessonPlan.create({ data: { campusId, ...b } });
    },
  },
  "download-types": {
    perm: ["communicate", "notice", "view"],
    list: (campusId) =>
      prisma.downloadType.findMany({ where: { campusId }, orderBy: { name: "asc" } }),
    create: async (campusId, _u, raw) => {
      const b = z.object({ name: z.string().min(1) }).parse(raw);
      return prisma.downloadType.create({ data: { campusId, name: b.name } });
    },
  },
  contents: {
    perm: ["communicate", "notice", "view"],
    list: (campusId) =>
      prisma.sharedContent.findMany({
        where: { campusId },
        include: { type: true },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({
          title: z.string().min(1),
          url: z.string().min(1),
          typeId: opt,
          audience: opt,
        })
        .parse(raw);
      return prisma.sharedContent.create({
        data: {
          campusId,
          title: b.title,
          url: b.url,
          typeId: b.typeId,
          audience: b.audience ?? "all",
        },
      });
    },
  },
  rooms: {
    perm: ["academics", "class", "view"],
    list: (campusId) =>
      prisma.bookableRoom.findMany({
        where: { campusId },
        include: { bookings: true },
      }),
    create: async (campusId, _u, raw) => {
      const b = z
        .object({ name: z.string().min(1), capacity: z.number().int().optional() })
        .parse(raw);
      return prisma.bookableRoom.create({
        data: { campusId, name: b.name, capacity: b.capacity ?? 20 },
      });
    },
  },
  "room-bookings": {
    perm: ["academics", "class", "view"],
    list: (campusId) =>
      prisma.roomBooking.findMany({
        where: { room: { campusId } },
        include: { room: true },
      }),
    create: async (campusId, userId, raw) => {
      const b = z
        .object({
          roomId: z.string().min(1),
          title: z.string().min(1),
          startAt: z.string().min(1),
          endAt: z.string().min(1),
        })
        .parse(raw);
      const room = await prisma.bookableRoom.findFirst({
        where: { id: b.roomId, campusId },
      });
      if (!room) throw notFound("room");
      const startAt = new Date(b.startAt);
      const endAt = new Date(b.endAt);
      if (!(endAt > startAt)) throw validationError({ endAt: "must be after start" });
      return prisma.roomBooking.create({
        data: {
          roomId: b.roomId,
          title: b.title,
          startAt,
          endAt,
          requestedBy: userId,
        },
      });
    },
  },
  homework: {
    perm: ["academics", "class", "view"],
    list: (campusId) =>
      prisma.homework.findMany({ where: { campusId }, orderBy: { title: "asc" } }),
    create: async (campusId, userId, raw) => {
      const b = z
        .object({
          title: z.string().min(1),
          classId: z.string().min(1),
          sectionId: z.string().min(1),
          description: opt,
          assignedOn: z.string().min(1),
          dueOn: z.string().min(1),
          subjectId: opt,
        })
        .parse(raw);
      return prisma.homework.create({
        data: {
          campusId,
          title: b.title,
          classId: b.classId,
          sectionId: b.sectionId,
          description: b.description,
          assignedOn: new Date(b.assignedOn),
          dueOn: new Date(b.dueOn),
          subjectId: b.subjectId,
          createdBy: userId,
        },
      });
    },
  },
};

export async function GET(
  request: Request,
  context: { params: Promise<{ collection: string }> },
) {
  try {
    const { collection } = await context.params;
    const handler = HANDLERS[collection];
    if (!handler) throw notFound("collection");
    const user = await requireApiPermission(request, ...handler.perm);
    return ok({ data: await handler.list(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ collection: string }> },
) {
  try {
    const { collection } = await context.params;
    const handler = HANDLERS[collection];
    if (!handler) throw notFound("collection");
    const user = await requireApiPermission(request, ...handler.perm);
    const row = await handler.create(user.campusId, user.id, await readJson(request));
    return created(row);
  } catch (error) {
    return fail(error);
  }
}
