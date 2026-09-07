import { ApplicationStatus, Gender, Prisma } from "@prisma/client";
import { z } from "zod";
import {
  classInCampus,
  parseDateOnly,
  sectionInCampus,
} from "@/lib/campus";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { createStudent } from "@/lib/services/students";

const emptyToUndef = (value: unknown) =>
  value === "" || value === null ? undefined : value;
const optStr = z.preprocess(emptyToUndef, z.string().min(1).optional());
const optEmail = z.preprocess(emptyToUndef, z.string().email().optional());

export const applicationCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: optStr,
  email: optEmail,
  mobile: optStr,
  dob: optStr,
  gender: z.nativeEnum(Gender).optional(),
  fatherName: optStr,
  programId: optStr,
});

export const enrollSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  sessionId: optStr,
  admissionNo: optStr,
});

export const paySchema = z.object({
  method: z.enum(["CASH", "UPI", "CHEQUE"]).default("CASH"),
});

export const FEE_SETTING_KEY = "admission.applicationFee";
const DEFAULT_FEE = "500";

export async function publicCampus() {
  const campus =
    (await prisma.campus.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.campus.findFirst());
  if (!campus) throw notFound("campus");
  return campus;
}

export async function applicationFeeAmount(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: FEE_SETTING_KEY } },
  });
  const raw = row?.value;
  if (typeof raw === "number" || typeof raw === "string") {
    return new Prisma.Decimal(raw);
  }
  return new Prisma.Decimal(DEFAULT_FEE);
}

export async function setApplicationFee(campusId: string, amount: number | string) {
  const fee = new Prisma.Decimal(amount);
  if (fee.lte(0)) throw validationError({ amount: "must be greater than 0" });
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: FEE_SETTING_KEY } },
    update: { value: Number(fee) },
    create: { campusId, key: FEE_SETTING_KEY, value: Number(fee) },
  });
  return fee;
}

async function nextApplicationNo(campusId: string) {
  const year = new Date().getFullYear();
  const prefix = `APP-${year}-`;
  const last = await prisma.application.findFirst({
    where: { campusId, applicationNo: { startsWith: prefix } },
    orderBy: { applicationNo: "desc" },
  });
  const n = last ? Number(last.applicationNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(Number.isFinite(n) ? n : 1).padStart(4, "0")}`;
}

export async function listPublicPrograms(campusId: string) {
  return prisma.program.findMany({
    where: { department: { campusId } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, level: true, code: true },
  });
}

export async function submitApplication(
  campusId: string,
  body: z.infer<typeof applicationCreateSchema>,
) {
  if (body.programId) {
    const program = await prisma.program.findFirst({
      where: { id: body.programId, department: { campusId } },
    });
    if (!program) throw notFound("program");
  }
  const feeAmount = await applicationFeeAmount(campusId);
  for (let attempt = 0; attempt < 5; attempt++) {
    const applicationNo = await nextApplicationNo(campusId);
    try {
      return await prisma.application.create({
        data: {
          campusId,
          applicationNo,
          firstName: body.firstName.trim(),
          lastName: body.lastName,
          email: body.email,
          mobile: body.mobile,
          dob: body.dob ? parseDateOnly(body.dob) : undefined,
          gender: body.gender,
          fatherName: body.fatherName,
          programId: body.programId,
          feeAmount,
          feePaid: new Prisma.Decimal(0),
          paymentStatus: "UNPAID",
          status: ApplicationStatus.APPLIED,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw conflict("could not allocate application number");
}

export async function listApplications(campusId: string, q?: string) {
  const needle = q?.trim();
  const rows = await prisma.application.findMany({
    where: {
      campusId,
      ...(needle
        ? {
            OR: [
              { applicationNo: { contains: needle, mode: "insensitive" } },
              { firstName: { contains: needle, mode: "insensitive" } },
              { lastName: { contains: needle, mode: "insensitive" } },
              { mobile: { contains: needle, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { program: { select: { name: true } }, student: { select: { admissionNo: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((row) => ({
    id: row.id,
    applicationNo: row.applicationNo,
    name: [row.firstName, row.lastName].filter(Boolean).join(" "),
    fatherName: row.fatherName,
    mobile: row.mobile,
    email: row.email,
    program: row.program?.name ?? null,
    paymentStatus: row.paymentStatus,
    status: row.status,
    feeAmount: row.feeAmount.toString(),
    feePaid: row.feePaid.toString(),
    enrolled: Boolean(row.studentId),
    admissionNo: row.student?.admissionNo ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function markApplicationPaid(
  campusId: string,
  id: string,
  method: string,
) {
  const row = await prisma.application.findFirst({ where: { id, campusId } });
  if (!row) throw notFound("application");
  if (row.status === ApplicationStatus.ENROLLED) {
    throw validationError({ status: "already enrolled" });
  }
  return prisma.application.update({
    where: { id },
    data: {
      paymentStatus: "PAID",
      paymentMethod: method,
      feePaid: row.feeAmount,
      status: ApplicationStatus.FEE_PAID,
    },
  });
}

export async function enrollApplication(
  campusId: string,
  id: string,
  body: z.infer<typeof enrollSchema>,
) {
  const row = await prisma.application.findFirst({ where: { id, campusId } });
  if (!row) throw notFound("application");
  if (row.studentId) throw conflict("already enrolled");
  if (row.paymentStatus !== "PAID") {
    throw validationError({ paymentStatus: "application fee unpaid" });
  }
  await classInCampus(campusId, body.classId);
  await sectionInCampus(campusId, body.sectionId);
  const admissionNo = (body.admissionNo ?? row.applicationNo).trim();
  const student = await createStudent({
    campusId,
    body: {
      admissionNo,
      firstName: row.firstName,
      lastName: row.lastName ?? undefined,
      email: row.email ?? undefined,
      mobile: row.mobile ?? undefined,
      dob: row.dob ? row.dob.toISOString().slice(0, 10) : undefined,
      gender: row.gender ?? undefined,
      fatherName: row.fatherName ?? undefined,
      classId: body.classId,
      sectionId: body.sectionId,
      sessionId: body.sessionId,
    },
  });
  const updated = await prisma.application.update({
    where: { id },
    data: {
      studentId: student.id,
      status: ApplicationStatus.ENROLLED,
    },
  });
  return { application: updated, student };
}
