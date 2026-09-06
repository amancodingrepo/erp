import { Gender, Prisma, StudentStatus } from "@prisma/client";
import { z } from "zod";
import {
  classInCampus,
  currentSessionId,
  parseDateOnly,
  sectionInCampus,
} from "@/lib/campus";
import { encryptField, decryptField, maskId } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import type { AuthPrincipal } from "@/lib/permissions";

const emptyToUndef = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optStr = z.preprocess(emptyToUndef, z.string().min(1).optional());
const optEmail = z.preprocess(emptyToUndef, z.string().email().optional());

const addressSchema = z.object({
  line1: optStr,
  line2: optStr,
  line3: optStr,
  city: optStr,
  atPost: optStr,
  village: optStr,
  taluka: optStr,
  district: optStr,
  region: optStr,
  state: optStr,
  pincode: optStr,
  nation: optStr,
});

const guardianInput = z.object({
  name: z.string().min(1),
  phone: optStr,
  email: optEmail,
  occupation: optStr,
  income: z.union([z.string(), z.number()]).optional(),
  pan: optStr,
});

export const studentCreateSchema = z.object({
  admissionNo: z.string().min(1),
  rollNo: optStr,
  enrollmentNo: optStr,
  abcId: optStr,
  admissionQuota: optStr,
  classId: optStr,
  sectionId: optStr,
  sessionId: optStr,
  salutation: optStr,
  firstName: z.string().min(1),
  middleName: optStr,
  lastName: optStr,
  nameAs12th: optStr,
  nameAsAadhaar: optStr,
  gender: z.nativeEnum(Gender).optional(),
  dob: optStr,
  birthPlace: optStr,
  categoryId: optStr,
  religion: optStr,
  caste: optStr,
  subCaste: optStr,
  minority: optStr,
  nationality: optStr,
  domicileState: optStr,
  feeCategory: optStr,
  admissionDate: optStr,
  mobile: optStr,
  email: optEmail,
  phone: optStr,
  instituteEmail: optEmail,
  aadhaar: optStr,
  pan: optStr,
  fatherName: optStr,
  addresses: z
    .object({
      permanent: addressSchema.optional(),
      local: addressSchema.optional(),
      localSameAsPermanent: z.boolean().optional(),
    })
    .optional(),
  previousEdu: z
    .object({
      qualification: optStr,
      board: optStr,
      university: optStr,
      universityState: optStr,
      universityPrn: optStr,
      marksObtained: z.union([z.string(), z.number()]).optional(),
      marksTotal: z.union([z.string(), z.number()]).optional(),
      percentage: z.union([z.string(), z.number()]).optional(),
      lastClassName: optStr,
      academicYear: optStr,
      lastRollNo: optStr,
      examSeatNo: optStr,
      lastResult: optStr,
    })
    .optional(),
  bank: z
    .object({
      accountNo: optStr,
      holderName: optStr,
      bankName: optStr,
      ifsc: optStr,
      branchName: optStr,
      branchAddress: optStr,
      accountType: optStr,
    })
    .optional(),
  guardians: z
    .object({
      father: guardianInput.optional(),
      mother: guardianInput.optional(),
      spouse: guardianInput.optional(),
    })
    .optional(),
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;

export const rollNumbersSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  startFrom: z.union([z.string(), z.number()]),
  arrangement: z.enum(["mix", "boys_first", "girls_first"]),
  sort: z.enum(["last", "first", "id"]),
});

function dec(value: string | number | undefined) {
  if (value === undefined || value === "") return undefined;
  return new Prisma.Decimal(value);
}

function parseGenderLabel(raw: string | undefined): Gender | undefined {
  if (!raw?.trim()) return undefined;
  const v = raw.trim().toUpperCase();
  if (v === "M" || v === "MALE" || v === "BOY" || v === "BOYS") return Gender.MALE;
  if (v === "F" || v === "FEMALE" || v === "GIRL" || v === "GIRLS") {
    return Gender.FEMALE;
  }
  if (v === "O" || v === "OTHER") return Gender.OTHER;
  throw validationError({ gender: "invalid gender" });
}

function parseDob(raw: string | undefined) {
  if (!raw?.trim()) return undefined;
  const value = raw.trim();
  const dmy = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(value);
  if (dmy) return parseDateOnly(`${dmy[3]}-${dmy[2]}-${dmy[1]}`);
  return parseDateOnly(value);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

const CSV_HEADERS: Record<string, string> = {
  "student id": "admissionNo",
  "admission no": "admissionNo",
  salutation: "salutation",
  "full name (12th)": "nameAs12th",
  "first name": "firstName",
  middle: "middleName",
  "middle name": "middleName",
  last: "lastName",
  "last name": "lastName",
  roll: "rollNo",
  "roll no": "rollNo",
  class: "className",
  section: "sectionName",
  "enrollment no": "enrollmentNo",
  dob: "dob",
  "birth place": "birthPlace",
  email: "email",
  qualification: "qualification",
  mobile: "mobile",
  phone: "phone",
  gender: "gender",
  category: "categoryName",
};

function displayName(s: {
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
}) {
  return [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
}

function listRow(s: {
  id: string;
  admissionNo: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  rollNo?: string | null;
  enrollmentNo?: string | null;
  dob?: Date | null;
  gender?: Gender | null;
  mobile?: string | null;
  status: StudentStatus;
  category?: { name: string } | null;
  enrollments: Array<{
    rollNo?: string | null;
    class: { name: string };
    section: { name: string };
  }>;
  guardians: Array<{ relation: string; guardian: { name: string } }>;
}) {
  const enrollment = s.enrollments[0];
  const father =
    s.guardians.find((g) => g.relation === "father")?.guardian ??
    s.guardians.find((g) => g.relation === "spouse")?.guardian;
  return {
    id: s.id,
    admissionNo: s.admissionNo,
    name: displayName(s),
    class: enrollment?.class.name ?? null,
    section: enrollment?.section.name ?? null,
    rollNo: enrollment?.rollNo ?? s.rollNo,
    enrollmentNo: s.enrollmentNo,
    fatherName: father?.name ?? null,
    dob: s.dob,
    gender: s.gender,
    category: s.category?.name ?? null,
    mobile: s.mobile,
    status: s.status,
  };
}

function filled(obj?: object | null) {
  if (!obj) return false;
  return Object.values(obj).some(
    (value) => value !== undefined && value !== null && value !== "",
  );
}

async function writeRelated(
  tx: Prisma.TransactionClient,
  studentId: string,
  body: StudentCreateInput,
) {
  const permanent = filled(body.addresses?.permanent)
    ? body.addresses?.permanent
    : undefined;
  const local = body.addresses?.localSameAsPermanent
    ? permanent
    : filled(body.addresses?.local)
      ? body.addresses?.local
      : undefined;
  if (permanent) {
    await tx.studentAddress.create({
      data: { studentId, kind: "permanent", ...permanent },
    });
  }
  if (local) {
    await tx.studentAddress.create({
      data: { studentId, kind: "local", ...local },
    });
  }
  const edu = body.previousEdu;
  if (edu && filled(edu)) {
    await tx.studentEducation.create({
      data: {
        studentId,
        qualification: edu.qualification,
        board: edu.board,
        university: edu.university,
        universityState: edu.universityState,
        universityPrn: edu.universityPrn,
        marksObtained: dec(edu.marksObtained),
        marksTotal: dec(edu.marksTotal),
        percentage: dec(edu.percentage),
        lastClassName: edu.lastClassName,
        academicYear: edu.academicYear,
        lastRollNo: edu.lastRollNo,
        examSeatNo: edu.examSeatNo,
        lastResult: edu.lastResult,
      },
    });
  }
  const bank = body.bank;
  if (bank && filled(bank)) {
    await tx.studentBank.create({
      data: {
        studentId,
        accountNoEnc: encryptField(bank.accountNo),
        holderName: bank.holderName,
        bankName: bank.bankName,
        ifsc: bank.ifsc,
        branchName: bank.branchName,
        branchAddress: bank.branchAddress,
        accountType: bank.accountType,
      },
    });
  }
  const father =
    body.guardians?.father ??
    (body.fatherName ? { name: body.fatherName } : undefined);
  const pairs: Array<{ relation: string; data: z.infer<typeof guardianInput> }> =
    [];
  if (father) pairs.push({ relation: "father", data: father });
  if (body.guardians?.mother) {
    pairs.push({ relation: "mother", data: body.guardians.mother });
  }
  if (body.guardians?.spouse) {
    pairs.push({ relation: "spouse", data: body.guardians.spouse });
  }
  for (const pair of pairs) {
    const guardian = await tx.guardian.create({
      data: {
        name: pair.data.name,
        phone: pair.data.phone,
        email: pair.data.email || null,
        occupation: pair.data.occupation,
        income: dec(pair.data.income),
        panEnc: encryptField(pair.data.pan),
      },
    });
    await tx.studentGuardian.create({
      data: {
        studentId,
        guardianId: guardian.id,
        relation: pair.relation,
      },
    });
  }
}

export async function createStudent(input: {
  campusId: string;
  body: StudentCreateInput;
  tx?: Prisma.TransactionClient;
}) {
  const body = input.body;
  if ((body.classId && !body.sectionId) || (body.sectionId && !body.classId)) {
    throw validationError({
      classId: "class and section must be provided together",
    });
  }
  let sessionId = body.sessionId;
  if (body.classId && body.sectionId) {
    const klass = await classInCampus(input.campusId, body.classId);
    const section = await sectionInCampus(input.campusId, body.sectionId);
    if (section.classId !== klass.id) {
      throw validationError({ sectionId: "section does not belong to class" });
    }
    if (!sessionId) {
      sessionId =
        (await currentSessionId({
          campusId: input.campusId,
        } as AuthPrincipal)) ?? undefined;
    }
    if (!sessionId) throw validationError({ sessionId: "session required" });
  }
  if (body.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, campusId: input.campusId },
    });
    if (!category) throw notFound("category");
  }

  try {
    const run = async (tx: Prisma.TransactionClient) => {
      const created = await tx.student.create({
        data: {
          campusId: input.campusId,
          admissionNo: body.admissionNo.trim(),
          rollNo: body.rollNo,
          enrollmentNo: body.enrollmentNo,
          abcId: body.abcId,
          admissionQuota: body.admissionQuota,
          salutation: body.salutation,
          firstName: body.firstName.trim(),
          middleName: body.middleName,
          lastName: body.lastName,
          nameAs12th: body.nameAs12th,
          nameAsAadhaar: body.nameAsAadhaar,
          gender: body.gender,
          dob: parseDob(body.dob),
          birthPlace: body.birthPlace,
          categoryId: body.categoryId,
          religion: body.religion,
          caste: body.caste,
          subCaste: body.subCaste,
          minority: body.minority,
          nationality: body.nationality,
          domicileState: body.domicileState,
          feeCategory: body.feeCategory,
          admissionDate: parseDob(body.admissionDate),
          mobile: body.mobile,
          email: body.email,
          phone: body.phone,
          instituteEmail: body.instituteEmail,
          aadhaarEnc: encryptField(body.aadhaar),
          panEnc: encryptField(body.pan),
        },
      });
      if (body.classId && body.sectionId && sessionId) {
        await tx.studentEnrollment.create({
          data: {
            studentId: created.id,
            sessionId,
            classId: body.classId,
            sectionId: body.sectionId,
            rollNo: body.rollNo,
            isCurrent: true,
          },
        });
      }
      await writeRelated(tx, created.id, body);
      return created;
    };
    if (input.tx) return run(input.tx);
    return prisma.$transaction(run);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("duplicate admissionNo");
    }
    throw error;
  }
}

export async function listStudents(input: {
  campusId: string;
  q?: string;
  classId?: string;
  sectionId?: string;
  status?: string | null;
  page: number;
  pageSize: number;
}) {
  const status =
    input.status === "all"
      ? undefined
      : ((input.status as StudentStatus | null | undefined) ??
        StudentStatus.ACTIVE);
  const q = input.q?.trim();
  const where: Prisma.StudentWhereInput = {
    campusId: input.campusId,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { middleName: { contains: q, mode: "insensitive" } },
            { admissionNo: { contains: q, mode: "insensitive" } },
            { enrollmentNo: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q } },
          ],
        }
      : {}),
    ...(input.classId || input.sectionId
      ? {
          enrollments: {
            some: {
              isCurrent: true,
              ...(input.classId ? { classId: input.classId } : {}),
              ...(input.sectionId ? { sectionId: input.sectionId } : {}),
            },
          },
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        category: true,
        enrollments: {
          where: { isCurrent: true },
          include: { class: true, section: true },
          take: 1,
        },
        guardians: { include: { guardian: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);
  return { data: rows.map(listRow), total, page: input.page, pageSize: input.pageSize };
}

export async function getStudent360(campusId: string, id: string) {
  const student = await prisma.student.findFirst({
    where: { id, campusId },
    include: {
      category: true,
      enrollments: {
        include: { class: true, section: true, session: true },
        orderBy: { session: { sequenceNo: "desc" } },
      },
      guardians: { include: { guardian: true } },
      addresses: true,
      previousEdu: true,
      bank: true,
      documents: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      attendances: { orderBy: { date: "desc" }, take: 30 },
      marks: {
        include: {
          examSubject: {
            include: { exam: { include: { group: true } } },
          },
        },
      },
    },
  });
  if (!student) throw notFound("student");
  const { aadhaarEnc, panEnc, bank, marks, invoices, attendances, ...rest } =
    student;
  const total = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const paid = invoices.reduce((sum, inv) => sum + Number(inv.paid), 0);
  const examMarks = marks.map((m) => {
    if (m.isBlocked) {
      return {
        id: m.id,
        examSubjectId: m.examSubjectId,
        exam: m.examSubject.exam.name,
        group: m.examSubject.exam.group.name,
        status: "withheld" as const,
        marks: null,
        isAbsent: null,
      };
    }
    return {
      id: m.id,
      examSubjectId: m.examSubjectId,
      exam: m.examSubject.exam.name,
      group: m.examSubject.exam.group.name,
      status: "ok" as const,
      marks: m.marks,
      isAbsent: m.isAbsent,
      finalizedAt: m.finalizedAt,
    };
  });
  const timeline = [
    {
      at: student.createdAt,
      event: "admitted",
      detail: student.admissionNo,
    },
    ...student.enrollments.map((e) => ({
      at: e.session.startDate ?? student.createdAt,
      event: e.isCurrent ? "enrolled" : "previous-enrollment",
      detail: `${e.session.name} · ${e.class.name} / ${e.section.name}`,
    })),
  ];
  return {
    ...rest,
    aadhaarMasked: maskId(decryptField(aadhaarEnc)),
    panMasked: maskId(decryptField(panEnc)),
    bank: bank
      ? {
          ...bank,
          accountNoEnc: undefined,
          accountNoMasked: maskId(decryptField(bank.accountNoEnc)),
        }
      : null,
    invoicesSummary: {
      count: invoices.length,
      total,
      paid,
      balance: total - paid,
      rows: invoices.map((inv) => ({
        id: inv.id,
        status: inv.status,
        total: inv.total,
        paid: inv.paid,
        createdAt: inv.createdAt,
      })),
    },
    attendance: attendances,
    exams: {
      withheld: examMarks.some((m) => m.status === "withheld"),
      marks: examMarks,
    },
    timeline,
  };
}

export async function generateRollNumbers(input: {
  campusId: string;
  classId: string;
  sectionId: string;
  startFrom: string | number;
  arrangement: "mix" | "boys_first" | "girls_first";
  sort: "last" | "first" | "id";
}) {
  const start = Number(input.startFrom);
  if (!Number.isInteger(start) || start < 1) {
    throw validationError({ startFrom: "must be a positive integer" });
  }
  await classInCampus(input.campusId, input.classId);
  const section = await sectionInCampus(input.campusId, input.sectionId);
  if (section.classId !== input.classId) {
    throw validationError({ sectionId: "section does not belong to class" });
  }
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classId: input.classId,
      sectionId: input.sectionId,
      isCurrent: true,
      student: { campusId: input.campusId, status: StudentStatus.ACTIVE },
    },
    include: { student: true },
  });

  const genderRank = (g: Gender | null) => {
    if (input.arrangement === "mix") return 0;
    if (input.arrangement === "boys_first") {
      if (g === Gender.MALE) return 0;
      if (g === Gender.FEMALE) return 1;
      return 2;
    }
    if (g === Gender.FEMALE) return 0;
    if (g === Gender.MALE) return 1;
    return 2;
  };
  const sortKey = (s: (typeof enrollments)[number]["student"]) => {
    if (input.sort === "last") return (s.lastName ?? "").toLowerCase();
    if (input.sort === "first") return s.firstName.toLowerCase();
    return s.admissionNo.toLowerCase();
  };
  const ordered = [...enrollments].sort((a, b) => {
    const g = genderRank(a.student.gender) - genderRank(b.student.gender);
    if (g !== 0) return g;
    return sortKey(a.student).localeCompare(sortKey(b.student));
  });

  const rolls: Array<{ studentId: string; rollNo: string }> = [];
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < ordered.length; i++) {
      const rollNo = String(start + i);
      const row = ordered[i];
      await tx.studentEnrollment.update({
        where: { id: row.id },
        data: { rollNo },
      });
      await tx.student.update({
        where: { id: row.studentId },
        data: { rollNo },
      });
      rolls.push({ studentId: row.studentId, rollNo });
    }
  });
  return { updated: rolls.length, rolls };
}

export async function importStudentsCsv(input: {
  campusId: string;
  text: string;
}) {
  const rows = parseCsv(input.text);
  if (rows.length < 2) {
    throw validationError({ file: "CSV must include a header and at least one row" });
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const mapped = header.map((h) => CSV_HEADERS[h] ?? null);
  if (!mapped.includes("admissionNo") || !mapped.includes("firstName")) {
    throw validationError({
      file: "CSV header must include Student ID and First Name",
    });
  }

  type LineError = { line: number; fields: Record<string, string> };
  const errors: LineError[] = [];
  const parsed: StudentCreateInput[] = [];
  const seen = new Set<string>();

  const classes = await prisma.class.findMany({
    where: { program: { department: { campusId: input.campusId } } },
    include: { sections: true },
  });
  const categories = await prisma.category.findMany({
    where: { campusId: input.campusId },
  });

  for (let i = 1; i < rows.length; i++) {
    const line = i + 1;
    const fields: Record<string, string> = {};
    const rec: Record<string, string> = {};
    rows[i].forEach((value, idx) => {
      const key = mapped[idx];
      if (key) rec[key] = value.trim();
    });
    if (!rec.admissionNo) fields.admissionNo = "required";
    if (!rec.firstName) fields.firstName = "required";
    if (!rec.email) fields.email = "required";
    if (!rec.mobile) fields.mobile = "required";
    if (!rec.nameAs12th) fields.nameAs12th = "required";
    const admissionKey = rec.admissionNo?.toLowerCase();
    if (admissionKey && seen.has(admissionKey)) {
      fields.admissionNo = "duplicate in file";
    }
    if (admissionKey) seen.add(admissionKey);

    let gender: Gender | undefined;
    try {
      gender = parseGenderLabel(rec.gender);
    } catch {
      fields.gender = "invalid gender";
    }

    let classId: string | undefined;
    let sectionId: string | undefined;
    if (rec.className) {
      const klass = classes.find(
        (c) => c.name.toLowerCase() === rec.className.toLowerCase(),
      );
      if (!klass) fields.className = "class not found";
      else {
        classId = klass.id;
        if (rec.sectionName) {
          const section = klass.sections.find(
            (s) => s.name.toLowerCase() === rec.sectionName.toLowerCase(),
          );
          if (!section) fields.sectionName = "section not found";
          else sectionId = section.id;
        }
      }
    }

    let categoryId: string | undefined;
    if (rec.categoryName) {
      const cat = categories.find(
        (c) => c.name.toLowerCase() === rec.categoryName.toLowerCase(),
      );
      if (!cat) fields.categoryName = "category not found";
      else categoryId = cat.id;
    }

    if (Object.keys(fields).length) {
      errors.push({ line, fields });
      continue;
    }

    parsed.push({
      admissionNo: rec.admissionNo,
      firstName: rec.firstName,
      middleName: rec.middleName,
      lastName: rec.lastName,
      salutation: rec.salutation,
      nameAs12th: rec.nameAs12th,
      rollNo: rec.rollNo,
      enrollmentNo: rec.enrollmentNo,
      dob: rec.dob,
      birthPlace: rec.birthPlace,
      email: rec.email,
      mobile: rec.mobile,
      phone: rec.phone,
      gender,
      classId,
      sectionId,
      categoryId,
      previousEdu: rec.qualification
        ? { qualification: rec.qualification }
        : undefined,
    });
  }

  if (errors.length) {
    const err = validationError({ file: "import failed" });
    err.errors = errors;
    throw err;
  }

  try {
    const ids: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const body of parsed) {
        const student = await createStudent({
          campusId: input.campusId,
          body,
          tx,
        });
        ids.push(student.id);
      }
    });
    return { inserted: ids.length, ids };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("duplicate admissionNo");
    }
    throw error;
  }
}

