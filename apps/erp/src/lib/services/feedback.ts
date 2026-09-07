import {
  FeedbackAudience,
  FeedbackFieldKind,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { isExamFormWindowOpen } from "@/lib/exam-form-window";
import {
  averageRating,
  countByOption,
  parseRating,
} from "@/lib/feedback-aggregate";

export async function createFeedbackForm(campusId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw validationError({ name: "required" });
  return prisma.feedbackForm.create({ data: { campusId, name: trimmed } });
}

export async function listFeedbackForms(campusId: string) {
  return prisma.feedbackForm.findMany({
    where: { campusId },
    include: { fields: { orderBy: { sortOrder: "asc" } }, assignments: true },
    orderBy: { name: "asc" },
  });
}

export async function addFeedbackField(
  campusId: string,
  input: {
    formId: string;
    label: string;
    kind: FeedbackFieldKind;
    options?: string[];
  },
) {
  const form = await prisma.feedbackForm.findFirst({
    where: { id: input.formId, campusId },
  });
  if (!form) throw notFound("form");
  const label = input.label.trim();
  if (!label) throw validationError({ label: "required" });
  if (input.kind === FeedbackFieldKind.MCQ && !input.options?.length) {
    throw validationError({ options: "required for MCQ" });
  }
  const count = await prisma.feedbackField.count({ where: { formId: form.id } });
  return prisma.feedbackField.create({
    data: {
      formId: form.id,
      label,
      kind: input.kind,
      options: input.options ?? Prisma.JsonNull,
      sortOrder: count,
    },
  });
}

export async function assignFeedbackForm(
  campusId: string,
  input: {
    formId: string;
    classId?: string;
    audience?: FeedbackAudience;
    opensAt: string;
    closesAt: string;
  },
) {
  const form = await prisma.feedbackForm.findFirst({
    where: { id: input.formId, campusId },
  });
  if (!form) throw notFound("form");
  if (input.classId) {
    const klass = await prisma.class.findFirst({
      where: { id: input.classId, program: { department: { campusId } } },
    });
    if (!klass) throw notFound("class");
  }
  const opensAt = new Date(input.opensAt);
  const closesAt = new Date(input.closesAt);
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    throw validationError({ opensAt: "invalid dates" });
  }
  if (closesAt.getTime() < opensAt.getTime()) {
    throw validationError({ closesAt: "must be after opensAt" });
  }
  return prisma.feedbackAssignment.create({
    data: {
      formId: form.id,
      classId: input.classId,
      audience: input.audience ?? FeedbackAudience.STUDENT,
      opensAt,
      closesAt,
    },
  });
}

function asAnswerMap(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export async function submitFeedback(
  campusId: string,
  input: {
    assignmentId: string;
    respondentId: string;
    answers: Record<string, unknown>;
    now?: Date;
  },
) {
  const assignment = await prisma.feedbackAssignment.findFirst({
    where: { id: input.assignmentId, form: { campusId } },
    include: { form: { include: { fields: true } } },
  });
  if (!assignment) throw notFound("assignment");
  if (
    !isExamFormWindowOpen(
      assignment.opensAt,
      assignment.closesAt,
      input.now ?? new Date(),
    )
  ) {
    throw validationError({ assignmentId: "window is closed" });
  }
  if (assignment.classId) {
    const enrolled = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: input.respondentId,
        classId: assignment.classId,
        isCurrent: true,
        student: { campusId },
      },
    });
    if (!enrolled) throw validationError({ respondentId: "not in assigned class" });
  }
  const existing = await prisma.feedbackResponse.findUnique({
    where: {
      assignmentId_respondentId: {
        assignmentId: assignment.id,
        respondentId: input.respondentId,
      },
    },
  });
  if (existing) throw conflict("already submitted");
  const answers: Record<string, string | number> = {};
  for (const field of assignment.form.fields) {
    const raw = input.answers[field.id];
    if (field.kind === FeedbackFieldKind.RATING) {
      const rating = parseRating(raw);
      if (rating === null) throw validationError({ [field.id]: "rating 1-5" });
      answers[field.id] = rating;
    } else if (field.kind === FeedbackFieldKind.MCQ) {
      const options = Array.isArray(field.options)
        ? field.options.map(String)
        : [];
      const value = String(raw ?? "");
      if (!options.includes(value)) {
        throw validationError({ [field.id]: "invalid option" });
      }
      answers[field.id] = value;
    } else {
      const text = String(raw ?? "").trim().slice(0, 2000);
      if (!text) throw validationError({ [field.id]: "required" });
      answers[field.id] = text;
    }
  }
  return prisma.feedbackResponse.create({
    data: {
      assignmentId: assignment.id,
      formId: assignment.formId,
      respondentId: input.respondentId,
      answers,
    },
  });
}

export async function listFeedbackResponses(campusId: string) {
  return prisma.feedbackResponse.findMany({
    where: { form: { campusId } },
    include: { form: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listOpenFeedbackAssignments(campusId: string) {
  const now = new Date();
  return prisma.feedbackAssignment.findMany({
    where: {
      form: { campusId },
      opensAt: { lte: now },
      closesAt: { gte: now },
    },
    include: { form: { include: { fields: { orderBy: { sortOrder: "asc" } } } } },
    orderBy: { closesAt: "asc" },
  });
}

export async function feedbackReport(campusId: string, formId: string) {
  const form = await prisma.feedbackForm.findFirst({
    where: { id: formId, campusId },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
      responses: true,
    },
  });
  if (!form) throw notFound("form");
  return {
    formId: form.id,
    name: form.name,
    responses: form.responses.length,
    fields: form.fields.map((field) => {
      const values = form.responses.map((r) => asAnswerMap(r.answers)[field.id]);
      if (field.kind === FeedbackFieldKind.RATING) {
        const nums = values
          .map((v) => parseRating(v))
          .filter((n): n is number => n !== null);
        return {
          id: field.id,
          label: field.label,
          kind: field.kind,
          average: averageRating(nums),
        };
      }
      if (field.kind === FeedbackFieldKind.MCQ) {
        return {
          id: field.id,
          label: field.label,
          kind: field.kind,
          counts: countByOption(values.filter((v) => v != null).map(String)),
        };
      }
      return {
        id: field.id,
        label: field.label,
        kind: field.kind,
        texts: values.filter((v) => typeof v === "string").map(String),
      };
    }),
  };
}
