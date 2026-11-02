import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { buildMeritRanks } from "@/lib/merit";
import { parseCsv } from "@/lib/services/students";
import { applicationFeeAmount, submitApplication } from "@/lib/services/applications";

export async function listCutoffs(campusId: string, programId?: string) {
  return prisma.cutoffRule.findMany({
    where: { campusId, ...(programId ? { programId } : {}) },
    include: { program: { select: { name: true } } },
    orderBy: [{ roundNo: "asc" }, { categoryCode: "asc" }],
  });
}

export async function upsertCutoff(
  campusId: string,
  input: {
    programId: string;
    roundNo: number;
    categoryCode: string;
    minScore: number | string;
  },
) {
  const program = await prisma.program.findFirst({
    where: { id: input.programId, department: { campusId } },
  });
  if (!program) throw notFound("program");
  const minScore = new Prisma.Decimal(input.minScore);
  const categoryCode = input.categoryCode.trim().toUpperCase();
  return prisma.cutoffRule.upsert({
    where: {
      campusId_programId_roundNo_categoryCode: {
        campusId,
        programId: input.programId,
        roundNo: input.roundNo,
        categoryCode,
      },
    },
    update: { minScore },
    create: {
      campusId,
      programId: input.programId,
      roundNo: input.roundNo,
      categoryCode,
      minScore,
    },
  });
}

export async function generateMeritList(input: {
  campusId: string;
  programId: string;
  roundNo: number;
}) {
  const program = await prisma.program.findFirst({
    where: { id: input.programId, department: { campusId: input.campusId } },
  });
  if (!program) throw notFound("program");
  const cutoffs = await prisma.cutoffRule.findMany({
    where: {
      campusId: input.campusId,
      programId: input.programId,
      roundNo: input.roundNo,
    },
  });
  if (!cutoffs.length) {
    throw validationError({ roundNo: "no cutoff rules for this round" });
  }
  const applicants = await prisma.application.findMany({
    where: {
      campusId: input.campusId,
      programId: input.programId,
      studentId: null,
    },
  });
  const result = buildMeritRanks(
    applicants.map((a) => ({
      id: a.id,
      score: a.score == null ? null : Number(a.score),
      categoryCode: a.categoryCode,
      programId: a.programId,
    })),
    cutoffs.map((c) => ({
      programId: c.programId,
      roundNo: c.roundNo,
      categoryCode: c.categoryCode,
      minScore: Number(c.minScore),
    })),
    input.roundNo,
    input.programId,
  );
  await prisma.$transaction(async (tx) => {
    for (const row of result.ranked) {
      await tx.application.update({
        where: { id: row.id },
        data: {
          meritRank: row.rank,
          cutoffRound: input.roundNo,
          selectionStatus: "MERIT",
        },
      });
    }
    if (result.rejected.length) {
      await tx.application.updateMany({
        where: { id: { in: result.rejected } },
        data: {
          meritRank: null,
          cutoffRound: input.roundNo,
          selectionStatus: "REJECTED",
        },
      });
    }
  });
  return {
    programId: input.programId,
    roundNo: input.roundNo,
    ranked: result.ranked.length,
    rejected: result.rejected.length,
  };
}

export async function setSelection(
  campusId: string,
  id: string,
  status: "SELECTED" | "WAITLISTED" | "REJECTED",
) {
  const row = await prisma.application.findFirst({ where: { id, campusId } });
  if (!row) throw notFound("application");
  if (row.selectionStatus !== "MERIT" && row.selectionStatus !== "SELECTED" && row.selectionStatus !== "WAITLISTED") {
    throw validationError({ selectionStatus: "not on a merit list" });
  }
  return prisma.application.update({
    where: { id },
    data: { selectionStatus: status },
  });
}

export async function importApplicantsCsv(campusId: string, text: string) {
  const table = parseCsv(text);
  if (table.length < 2) throw validationError({ file: "empty csv" });
  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (aliases: string[]) => {
    const i = header.findIndex((h) => aliases.includes(h));
    return i;
  };
  const iFirst = col(["first name", "firstname", "name"]);
  const iLast = col(["last name", "lastname"]);
  const iCat = col(["category", "category code", "categorycode"]);
  const iScore = col(["score", "marks", "merit score"]);
  const iProgram = col(["program", "course", "program name"]);
  const iMobile = col(["mobile", "contact phone", "phone"]);
  const iEmail = col(["email", "contact email"]);
  if (iFirst < 0 || iScore < 0) {
    throw validationError({ file: "need First Name and Score columns" });
  }
  const programs = await prisma.program.findMany({
    where: { department: { campusId } },
  });
  const fee = await applicationFeeAmount(campusId);
  const errors: Array<{ line: number; message: string }> = [];
  const rows: Array<{
    firstName: string;
    lastName?: string;
    categoryCode?: string;
    score: string;
    programId?: string;
    mobile?: string;
    email?: string;
  }> = [];
  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const firstName = (cells[iFirst] ?? "").trim();
    const score = (cells[iScore] ?? "").trim();
    if (!firstName || !score || Number.isNaN(Number(score))) {
      errors.push({ line, message: "first name and numeric score required" });
      return;
    }
    const programName = iProgram >= 0 ? (cells[iProgram] ?? "").trim() : "";
    const program = programName
      ? programs.find(
          (p) => p.name.toLowerCase() === programName.toLowerCase(),
        )
      : undefined;
    if (programName && !program) {
      errors.push({ line, message: `unknown program ${programName}` });
      return;
    }
    rows.push({
      firstName,
      lastName: iLast >= 0 ? cells[iLast]?.trim() : undefined,
      categoryCode: iCat >= 0 ? cells[iCat]?.trim() : undefined,
      score,
      programId: program?.id,
      mobile: iMobile >= 0 ? cells[iMobile]?.trim() : undefined,
      email: iEmail >= 0 ? cells[iEmail]?.trim() : undefined,
    });
  });
  if (errors.length) {
    const err = validationError({ file: "csv has errors" });
    err.errors = errors;
    throw err;
  }
  void fee;
  const created = [];
  for (const row of rows) {
    created.push(
      await submitApplication(campusId, {
        firstName: row.firstName,
        lastName: row.lastName || undefined,
        categoryCode: row.categoryCode || undefined,
        score: row.score,
        programId: row.programId,
        mobile: row.mobile || undefined,
        email: row.email || undefined,
      }),
    );
  }
  return { inserted: created.length };
}
