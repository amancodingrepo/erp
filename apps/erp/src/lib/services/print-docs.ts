import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { campusLetterhead } from "@/lib/letterhead";
import { buildCertificatePdf, buildIdCardPdf } from "@/lib/pdf/id-card";
import { renderTemplate } from "@/lib/templates";

export async function upsertPrintTemplate(
  campusId: string,
  input: { kind: string; name: string; body: string },
) {
  return prisma.printTemplate.upsert({
    where: {
      campusId_kind_name: {
        campusId,
        kind: input.kind,
        name: input.name.trim(),
      },
    },
    update: { body: input.body },
    create: {
      campusId,
      kind: input.kind,
      name: input.name.trim(),
      body: input.body,
    },
  });
}

export async function listPrintTemplates(campusId: string, kind?: string) {
  return prisma.printTemplate.findMany({
    where: { campusId, ...(kind ? { kind } : {}) },
    orderBy: { name: "asc" },
  });
}

export async function studentIdCardPdf(campusId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, campusId },
    include: {
      enrollments: {
        where: { isCurrent: true },
        include: { class: true, section: true },
        take: 1,
      },
    },
  });
  if (!student) throw notFound("student");
  const letter = await campusLetterhead(campusId);
  const enrollment = student.enrollments[0];
  const pdf = buildIdCardPdf({
    kind: "STUDENT",
    campusName: letter.campusName,
    header: letter.header,
    name: [student.firstName, student.lastName].filter(Boolean).join(" "),
    idNo: student.admissionNo,
    roleLine: [enrollment?.class.name, enrollment?.section.name]
      .filter(Boolean)
      .join(" / "),
    extra: [student.mobile].filter(Boolean) as string[],
  });
  return { pdf, admissionNo: student.admissionNo };
}

export async function staffIdCardPdf(campusId: string, staffId: string) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, campusId },
    include: { designation: true, department: true },
  });
  if (!staff) throw notFound("staff");
  const letter = await campusLetterhead(campusId);
  const pdf = buildIdCardPdf({
    kind: "STAFF",
    campusName: letter.campusName,
    header: letter.header,
    name: [staff.firstName, staff.lastName].filter(Boolean).join(" "),
    idNo: staff.employeeId,
    roleLine: [staff.designation?.name, staff.department?.name]
      .filter(Boolean)
      .join(" / "),
  });
  return { pdf, employeeId: staff.employeeId };
}

export async function studentCertificatePdf(
  campusId: string,
  studentId: string,
  templateId?: string,
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, campusId },
    include: {
      enrollments: {
        where: { isCurrent: true },
        include: { class: true, section: true },
        take: 1,
      },
    },
  });
  if (!student) throw notFound("student");
  const template = templateId
    ? await prisma.printTemplate.findFirst({
        where: { id: templateId, campusId, kind: "CERTIFICATE" },
      })
    : await prisma.printTemplate.findFirst({
        where: { campusId, kind: "CERTIFICATE" },
        orderBy: { createdAt: "asc" },
      });
  const letter = await campusLetterhead(campusId);
  const enrollment = student.enrollments[0];
  const vars = {
    name: [student.firstName, student.lastName].filter(Boolean).join(" "),
    admissionNo: student.admissionNo,
    class: enrollment?.class.name ?? "",
    section: enrollment?.section.name ?? "",
    campus: letter.campusName,
  };
  const body = template
    ? renderTemplate(template.body, vars)
    : `This is to certify that ${vars.name} (${vars.admissionNo}) is a bona fide student of ${vars.campus}.`;
  const pdf = buildCertificatePdf({
    campusName: letter.campusName,
    header: letter.header,
    footer: letter.footer,
    title: template?.name ?? "Bonafide Certificate",
    lines: body.split("\n"),
  });
  await prisma.certificateIssue.create({
    data: {
      campusId,
      templateId: template?.id,
      studentId,
      title: template?.name ?? "Bonafide Certificate",
    },
  });
  return { pdf, title: template?.name ?? "Bonafide Certificate" };
}

export async function listCertificateIssues(campusId: string) {
  return prisma.certificateIssue.findMany({
    where: { campusId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
