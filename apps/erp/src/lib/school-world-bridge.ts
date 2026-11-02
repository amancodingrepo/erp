import { randomBytes, randomUUID } from "crypto";
import { ActorType, Gender, Prisma, StudentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { HttpError, conflict, forbidden, notFound } from "./errors";
import type { AuthPrincipal } from "./permissions";
import { assertCampusStaff, schoolWorldRole, schoolWorldUser } from "./school-world-shape";

const CLASS_KEY = "school-class-catalog";
const SUBJECT_KEY = "school-subject-catalog";
const PROFILE_KEY = "staff-profile";
const OPTIONAL_KEY = "optional-subject-selections";
const LINK_KEY = "external-links";
const QUESTION_KEY = "questionnaire-doc";
const CONFIG_KEY = "school-world-config";

const SCHOOL_ROLES = ["school_admin", "principal", "teacher", "staff", "transport_admin"] as const;

type JsonRecord = Record<string, unknown>;

export type ClassCatalogRow = {
  id: string;
  name: string;
  section: string;
  displayName: string;
  availableFrom: string | null;
  availableTo: string | null;
  virtualClassroom: string;
  hiddenGrade: boolean;
  status: "Active" | "Inactive";
  displayOrder: number;
  subjectMappings: JsonRecord[];
  createdAt: string;
  updatedAt: string;
};

export type SubjectCatalogRow = {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  status: "Active" | "Inactive";
  subjectTypes: string[];
  classes: string[];
  createdAt: string;
  updatedAt: string;
};

export async function requireStaff(request: Request) {
  const { principalFromRequest } = await import("./principal");
  const user = await principalFromRequest(request);
  assertCampusStaff(user);
  return user;
}

export async function requireSchoolAdmin(request: Request) {
  const user = await requireStaff(request);
  const role = schoolWorldRole(user);
  if (role !== "school_admin" && role !== "principal") {
    throw forbidden("This action is for a school administrator.");
  }
  return user;
}

function clean(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function lower(value: unknown) {
  return clean(value).toLowerCase();
}

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function dateOnly(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function parseDate(value: unknown, required = false) {
  const text = clean(value);
  if (!text) {
    if (required) throw new HttpError(400, "validation_error", "A date is required.");
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new HttpError(400, "validation_error", "Invalid date. Use YYYY-MM-DD.");
  }
  return new Date(`${text}T00:00:00.000Z`);
}

function mapGender(value: unknown): Gender | null {
  const text = clean(value).toLowerCase();
  if (text === "male" || text === "m") return Gender.MALE;
  if (text === "female" || text === "f") return Gender.FEMALE;
  if (text === "other" || text === "o") return Gender.OTHER;
  return null;
}

function genderLabel(value: Gender | null | undefined) {
  if (value === Gender.MALE) return "Male";
  if (value === Gender.FEMALE) return "Female";
  if (value === Gender.OTHER) return "Other";
  return "";
}

function accountRole(roleNames: string[], actorType: string) {
  const names = roleNames.map((name) => name.toLowerCase());
  if (actorType === "STUDENT") return "student";
  if (actorType === "GUARDIAN") return "parent";
  if (names.some((name) => name.includes("transport"))) return "transport_admin";
  if (names.some((name) => name.includes("principal"))) return "principal";
  if (names.some((name) => name.includes("teacher"))) return "teacher";
  if (names.some((name) => name.includes("admin"))) return "school_admin";
  return "staff";
}

const ROLE_RECORD: Record<string, string> = {
  school_admin: "SuperAdmin",
  principal: "Principal",
  teacher: "Teacher",
  staff: "Staff",
  transport_admin: "Transport Admin",
};

function isUnique(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function readBag(campusId: string, screenKey: string) {
  const row = await prisma.screenRecord.findFirst({
    where: { campusId, screenKey, title: "state" },
    orderBy: { updatedAt: "desc" },
  });
  return asObject(row?.payload);
}

async function writeBag(campusId: string, screenKey: string, payload: JsonRecord) {
  const existing = await prisma.screenRecord.findFirst({
    where: { campusId, screenKey, title: "state" },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
    await prisma.screenRecord.update({
      where: { id: existing.id },
      data: { payload: payload as Prisma.InputJsonValue },
    });
    return;
  }
  await prisma.screenRecord.create({
    data: { campusId, screenKey, title: "state", payload: payload as Prisma.InputJsonValue },
  });
}

async function schoolProgram(campusId: string) {
  const department = await prisma.department.upsert({
    where: { campusId_name: { campusId, name: "School" } },
    update: {},
    create: { campusId, name: "School", code: "SCHOOL" },
  });
  const existing = await prisma.program.findFirst({
    where: { departmentId: department.id, name: "School" },
  });
  if (existing) return existing;
  return prisma.program.create({
    data: { departmentId: department.id, name: "School", code: "SCHOOL" },
  });
}

export async function ensureClassSection(campusId: string, className: string, sectionName: string) {
  const program = await schoolProgram(campusId);
  const name = clean(className);
  if (!name) throw new HttpError(400, "validation_error", "Class is required.");
  let schoolClass = await prisma.class.findFirst({ where: { programId: program.id, name } });
  if (!schoolClass) {
    schoolClass = await prisma.class.create({
      data: { programId: program.id, name, isActive: true },
    });
  }
  const sectionLabel = clean(sectionName) || "—";
  let section = await prisma.section.findFirst({
    where: { classId: schoolClass.id, name: sectionLabel },
  });
  if (!section) {
    section = await prisma.section.create({
      data: { classId: schoolClass.id, name: sectionLabel },
    });
  }
  return { classId: schoolClass.id, sectionId: section.id };
}

async function ensureSession(campusId: string, label: string, start?: Date | null, end?: Date | null, current = false) {
  const name = clean(label);
  if (!name || name.length > 30) {
    throw new HttpError(400, "validation_error", "Academic year label is required and must be at most 30 characters.");
  }
  return prisma.$transaction(async (tx) => {
    if (current) {
      await tx.academicSession.updateMany({ where: { campusId }, data: { isCurrent: false } });
    }
    const existing = await tx.academicSession.findUnique({
      where: { campusId_name: { campusId, name } },
    });
    const row = existing
      ? await tx.academicSession.update({
          where: { id: existing.id },
          data: {
            startDate: start ?? existing.startDate,
            endDate: end ?? existing.endDate,
            isCurrent: current ? true : existing.isCurrent,
            isActive: true,
          },
        })
      : await tx.academicSession.create({
          data: {
            campusId,
            name,
            startDate: start,
            endDate: end,
            isCurrent: current,
            isActive: true,
          },
        });
    if (row.isCurrent) {
      await tx.campus.update({ where: { id: campusId }, data: { currentSessionId: row.id } });
    }
    return row;
  });
}

function yearView(row: { id: string; name: string; startDate: Date | null; endDate: Date | null; isCurrent: boolean }) {
  return {
    id: row.id,
    label: row.name,
    start_date: dateOnly(row.startDate),
    end_date: dateOnly(row.endDate),
    is_current: row.isCurrent,
    startDate: dateOnly(row.startDate),
    endDate: dateOnly(row.endDate),
    isCurrent: row.isCurrent,
  };
}

export async function listAcademicYears(campusId: string) {
  const rows = await prisma.academicSession.findMany({
    where: { campusId },
    orderBy: { name: "desc" },
  });
  return rows.map(yearView);
}

export async function saveAcademicYear(campusId: string, body: JsonRecord, yearId?: string) {
  const start = parseDate(body.startDate);
  const end = parseDate(body.endDate);
  if (start && end && start > end) {
    throw new HttpError(400, "validation_error", "Academic year end date must be on or after its start date.");
  }
  if (yearId) {
    const existing = await prisma.academicSession.findFirst({ where: { id: yearId, campusId } });
    if (!existing) throw notFound("Academic year");
    const label = body.label === undefined ? existing.name : clean(body.label);
    const isCurrent = body.isCurrent === undefined ? existing.isCurrent : body.isCurrent === true;
    if (!label || label.length > 30) {
      throw new HttpError(400, "validation_error", "Academic year label is required and must be at most 30 characters.");
    }
    try {
      const saved = await prisma.$transaction(async (tx) => {
        if (isCurrent) {
          await tx.academicSession.updateMany({
            where: { campusId, NOT: { id: existing.id } },
            data: { isCurrent: false },
          });
        }
        const row = await tx.academicSession.update({
          where: { id: existing.id },
          data: {
            name: label,
            startDate: body.startDate === undefined ? existing.startDate : start,
            endDate: body.endDate === undefined ? existing.endDate : end,
            isCurrent,
          },
        });
        if (row.isCurrent) {
          await tx.campus.update({ where: { id: campusId }, data: { currentSessionId: row.id } });
        }
        return row;
      });
      return yearView(saved);
    } catch (error) {
      if (isUnique(error)) throw conflict("An academic year with this label already exists.");
      throw error;
    }
  }
  const isCurrent = body.isCurrent === undefined ? true : body.isCurrent === true;
  try {
    const saved = await ensureSession(campusId, clean(body.label), start, end, isCurrent);
    return yearView(saved);
  } catch (error) {
    if (isUnique(error)) throw conflict("An academic year with this label already exists.");
    throw error;
  }
}

function classRow(raw: unknown, index: number, now: string): ClassCatalogRow {
  const item = asObject(raw);
  const name = clean(item.name);
  const section = clean(item.section);
  const displayName = clean(item.displayName);
  if (!name) throw new HttpError(400, "validation_error", "Every class must have a class name.");
  if (name.length > 100 || section.length > 50 || displayName.length > 120) {
    throw new HttpError(400, "validation_error", "Class name, section, or display name exceeds its maximum length.");
  }
  const availableFrom = clean(item.availableFrom);
  const availableTo = clean(item.availableTo);
  if (availableFrom && !/^\d{4}-\d{2}-\d{2}$/.test(availableFrom)) {
    throw new HttpError(400, "validation_error", "Available From must be a valid date.");
  }
  if (availableTo && !/^\d{4}-\d{2}-\d{2}$/.test(availableTo)) {
    throw new HttpError(400, "validation_error", "Available To must be a valid date.");
  }
  const order = Number(item.displayOrder ?? index + 1);
  return {
    id: clean(item.id) || randomUUID(),
    name,
    section,
    displayName,
    availableFrom: availableFrom || null,
    availableTo: availableTo || null,
    virtualClassroom: clean(item.virtualClassroom),
    hiddenGrade: Boolean(item.hiddenGrade),
    status: String(item.status || "Active").toLowerCase() === "inactive" ? "Inactive" : "Active",
    displayOrder: Number.isFinite(order) ? Math.max(0, Math.min(100000, Math.trunc(order))) : index + 1,
    subjectMappings: Array.isArray(item.subjectMappings) ? item.subjectMappings.map((entry) => asObject(entry)) : [],
    createdAt: clean(item.createdAt) || now,
    updatedAt: now,
  };
}

async function synthesizedClasses(campusId: string): Promise<ClassCatalogRow[]> {
  const rows = await prisma.class.findMany({
    where: { program: { department: { campusId } } },
    include: { sections: true },
    orderBy: [{ sequenceNo: "asc" }, { name: "asc" }],
  });
  const now = new Date().toISOString();
  const catalog: ClassCatalogRow[] = [];
  for (const row of rows) {
    const sections = row.sections.length ? row.sections : [{ id: row.id, name: "" }];
    for (const section of sections) {
      catalog.push({
        id: section.id,
        name: row.name,
        section: section.name === "—" ? "" : section.name,
        displayName: "",
        availableFrom: null,
        availableTo: null,
        virtualClassroom: "",
        hiddenGrade: false,
        status: row.isActive ? "Active" : "Inactive",
        displayOrder: row.sequenceNo,
        subjectMappings: [],
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return catalog;
}

export async function listClasses(campusId: string) {
  const bag = await readBag(campusId, CLASS_KEY);
  const saved = Array.isArray(bag.classes) ? (bag.classes as ClassCatalogRow[]) : [];
  if (saved.length) return saved;
  return synthesizedClasses(campusId);
}

export async function syncClasses(campusId: string, raw: unknown) {
  if (!Array.isArray(raw) || raw.length > 500) {
    throw new HttpError(400, "validation_error", "Manage Classes must send a class list of up to 500 records.");
  }
  const now = new Date().toISOString();
  const classes = raw.map((item, index) => classRow(item, index, now));
  const seen = new Set<string>();
  for (const row of classes) {
    const key = `${row.name.toLowerCase()}|${row.section.toLowerCase()}`;
    if (seen.has(key)) throw conflict(`Duplicate class: ${row.name} ${row.section}`.trim());
    seen.add(key);
  }
  await writeBag(campusId, CLASS_KEY, { classes });
  for (const row of classes) {
    if (row.status === "Inactive") continue;
    await ensureClassSection(campusId, row.name, row.section);
  }
  return classes;
}

function subjectRow(raw: unknown, now: string): SubjectCatalogRow {
  const item = asObject(raw);
  const name = clean(item.name);
  if (!name) throw new HttpError(400, "validation_error", "Subject name is required.");
  const code = clean(item.code);
  const category = clean(item.category);
  const description = clean(item.description);
  if (name.length > 150 || code.length > 50 || category.length > 100 || description.length > 1000) {
    throw new HttpError(400, "validation_error", "Subject name, code, category, or description exceeds the allowed length.");
  }
  return {
    id: clean(item.id) || randomUUID(),
    name,
    code,
    category,
    description,
    status: String(item.status || "Active").toLowerCase() === "inactive" ? "Inactive" : "Active",
    subjectTypes: [...new Set((Array.isArray(item.subjectTypes) ? item.subjectTypes : []).map((entry) => clean(entry)).filter(Boolean))],
    classes: [...new Set((Array.isArray(item.classes) ? item.classes : String(item.classesText || "").split(",")).map((entry) => clean(entry)).filter(Boolean))],
    createdAt: clean(item.createdAt) || now,
    updatedAt: now,
  };
}

export async function listSubjects(campusId: string) {
  const bag = await readBag(campusId, SUBJECT_KEY);
  const saved = Array.isArray(bag.subjects) ? (bag.subjects as SubjectCatalogRow[]) : [];
  if (saved.length) return saved;
  const rows = await prisma.subject.findMany({
    where: { campusId },
    include: { category: true, subjectType: true },
    orderBy: { name: "asc" },
  });
  const now = new Date().toISOString();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code || "",
    category: row.category?.name || "",
    description: "",
    status: "Active" as const,
    subjectTypes: row.subjectType ? [row.subjectType.name] : [],
    classes: [],
    createdAt: now,
    updatedAt: now,
  }));
}

export async function syncSubjects(campusId: string, raw: unknown) {
  if (!Array.isArray(raw) || raw.length > 1000) {
    throw new HttpError(400, "validation_error", "Manage Subjects must send up to 1,000 subject records.");
  }
  const now = new Date().toISOString();
  const subjects = raw.map((item) => subjectRow(item, now));
  const names = new Set<string>();
  const codes = new Set<string>();
  for (const row of subjects) {
    const nameKey = row.name.toLowerCase();
    const codeKey = row.code.toLowerCase();
    if (names.has(nameKey)) throw conflict(`Duplicate subject name: ${row.name}.`);
    if (row.code && codes.has(codeKey)) throw conflict(`Duplicate subject code: ${row.code}.`);
    names.add(nameKey);
    if (row.code) codes.add(codeKey);
  }
  await writeBag(campusId, SUBJECT_KEY, { subjects });
  for (const row of subjects) {
    let categoryId: string | null = null;
    if (row.category) {
      const category = await prisma.subjectCategory.upsert({
        where: { campusId_name: { campusId, name: row.category } },
        update: {},
        create: { campusId, name: row.category },
      });
      categoryId = category.id;
    }
    const existing = await prisma.subject.findFirst({ where: { campusId, name: row.name } });
    if (existing) {
      await prisma.subject.update({
        where: { id: existing.id },
        data: { code: row.code || null, categoryId, isOptional: row.subjectTypes.some((type) => type.toLowerCase().includes("optional")) },
      });
    } else {
      await prisma.subject.create({
        data: {
          campusId,
          name: row.name,
          code: row.code || null,
          categoryId,
          isOptional: row.subjectTypes.some((type) => type.toLowerCase().includes("optional")),
        },
      });
    }
  }
  return subjects;
}

async function nameCatalog(campusId: string, screenKey: string, field: string) {
  const bag = await readBag(campusId, screenKey);
  return Array.isArray(bag[field]) ? bag[field] : [];
}

export async function listNamedCatalog(campusId: string, kind: "categories" | "subjectTypes") {
  if (kind === "categories") {
    const saved = await nameCatalog(campusId, "subject-categories", "categories");
    if (saved.length) return saved;
    const rows = await prisma.subjectCategory.findMany({ where: { campusId }, orderBy: { name: "asc" } });
    return rows.map((row) => ({ id: row.id, name: row.name, isActive: true }));
  }
  const saved = await nameCatalog(campusId, "subject-types", "subjectTypes");
  if (saved.length) return saved;
  const rows = await prisma.subjectType.findMany({ where: { campusId }, orderBy: { name: "asc" } });
  return rows.map((row) => ({ id: row.id, name: row.name, isActive: true }));
}

export async function syncNamedCatalog(campusId: string, kind: "categories" | "subjectTypes", raw: unknown) {
  if (!Array.isArray(raw) || raw.length > 500) {
    throw new HttpError(400, "validation_error", "Up to 500 names can be saved at once.");
  }
  const items = raw
    .map((item) => {
      const row = asObject(item);
      return { id: clean(row.id) || randomUUID(), name: clean(row.name), isActive: true };
    })
    .filter((item) => item.name);
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) throw conflict(`Duplicate name: ${item.name}.`);
    seen.add(key);
    if (kind === "categories") {
      await prisma.subjectCategory.upsert({
        where: { campusId_name: { campusId, name: item.name } },
        update: {},
        create: { campusId, name: item.name },
      });
    } else {
      await prisma.subjectType.upsert({
        where: { campusId_name: { campusId, name: item.name } },
        update: {},
        create: { campusId, name: item.name },
      });
    }
  }
  const screenKey = kind === "categories" ? "subject-categories" : "subject-types";
  const field = kind === "categories" ? "categories" : "subjectTypes";
  await writeBag(campusId, screenKey, { [field]: items });
  return items;
}

type StaffProfile = {
  personType?: string;
  middleName?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  alternateContactNumber?: string;
  className?: string;
  section?: string;
  metadata?: JsonRecord;
};

async function profilesByStaff(campusId: string) {
  const rows = await prisma.screenRecord.findMany({
    where: { campusId, screenKey: PROFILE_KEY },
  });
  const map = new Map<string, StaffProfile>();
  for (const row of rows) map.set(row.title, asObject(row.payload) as StaffProfile);
  return map;
}

async function writeProfile(campusId: string, staffId: string, profile: StaffProfile) {
  const existing = await prisma.screenRecord.findFirst({
    where: { campusId, screenKey: PROFILE_KEY, title: staffId },
  });
  const payload = profile as Prisma.InputJsonValue;
  if (existing) {
    await prisma.screenRecord.update({ where: { id: existing.id }, data: { payload } });
  } else {
    await prisma.screenRecord.create({
      data: { campusId, screenKey: PROFILE_KEY, title: staffId, payload },
    });
  }
}

function personFromStaff(
  staff: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    gender: Gender | null;
    isActive: boolean;
    joiningDate: Date | null;
    user?: { roles: { role: { name: string } }[]; actorType: ActorType } | null;
  },
  profile: StaffProfile | undefined,
) {
  const role = staff.user ? accountRole(staff.user.roles.map((item) => item.role.name), staff.user.actorType) : "";
  const personType = profile?.personType || (role === "teacher" ? "teacher" : "staff");
  const middleName = profile?.middleName || "";
  const fullName = [staff.firstName, middleName, staff.lastName].filter(Boolean).join(" ");
  return {
    id: staff.id,
    personType,
    externalId: staff.employeeId,
    firstName: staff.firstName,
    middleName,
    lastName: staff.lastName || "",
    fullName,
    email: staff.email || "",
    contactNumber: staff.phone || "",
    alternateContactNumber: profile?.alternateContactNumber || "",
    dateOfBirth: profile?.dateOfBirth || "",
    address: profile?.address || "",
    city: profile?.city || "",
    state: profile?.state || "",
    className: profile?.className || "",
    section: profile?.section || "",
    rollNumber: "",
    enrollmentNumber: "",
    status: staff.isActive ? "Active" : "Inactive",
    gender: genderLabel(staff.gender),
    parentGuardianName: "",
    metadata: profile?.metadata || {},
    joiningDate: dateOnly(staff.joiningDate),
  };
}

export async function listPeople(campusId: string, type: string) {
  const wanted = type.toLowerCase();
  const staff = await prisma.staff.findMany({
    where: { campusId },
    include: { user: { include: { roles: { include: { role: true } } } } },
    orderBy: { firstName: "asc" },
  });
  const profiles = await profilesByStaff(campusId);
  const people = staff
    .map((row) => personFromStaff(row, profiles.get(row.id)))
    .filter((person) => !wanted || person.personType === wanted);
  if (wanted && wanted !== "parent" && wanted !== "guardian") return people;
  const guardians = await prisma.guardian.findMany({
    where: { links: { some: { student: { campusId } } } },
    orderBy: { name: "asc" },
  });
  for (const guardian of guardians) {
    const [firstName, ...rest] = guardian.name.split(" ");
    people.push({
      id: guardian.id,
      personType: "parent",
      externalId: "",
      firstName: firstName || guardian.name,
      middleName: "",
      lastName: rest.join(" "),
      fullName: guardian.name,
      email: guardian.email || "",
      contactNumber: guardian.phone || "",
      alternateContactNumber: "",
      dateOfBirth: "",
      address: "",
      city: "",
      state: "",
      className: "",
      section: "",
      rollNumber: "",
      enrollmentNumber: "",
      status: "Active",
      gender: "",
      parentGuardianName: "",
      metadata: {},
      joiningDate: null,
    });
  }
  return people;
}

async function loadStaffPerson(campusId: string, id: string) {
  const staff = await prisma.staff.findFirst({
    where: { id, campusId },
    include: { user: { include: { roles: { include: { role: true } } } } },
  });
  if (!staff) throw new HttpError(404, "not_found", "Contact not found in this school.");
  const profiles = await profilesByStaff(campusId);
  return { staff, person: personFromStaff(staff, profiles.get(staff.id)) };
}

export async function createPerson(campusId: string, body: JsonRecord) {
  const type = clean(body.personType).toLowerCase();
  const name = clean(body.fullName);
  if (!["teacher", "staff", "parent", "day_care", "guardian", "other"].includes(type) || !name) {
    throw new HttpError(400, "validation_error", "Provide a valid person type and full name.");
  }
  const metadata = asObject(body.metadata);
  const details = asObject(metadata.staffDetails);
  const joiningText = clean(details.joiningDate);
  if (["teacher", "staff"].includes(type) && !joiningText) {
    throw new HttpError(400, "validation_error", "Joining date is required for staff.");
  }
  let externalId = clean(body.externalId);
  const taken = async (code: string) => Boolean(await prisma.staff.findFirst({ where: { campusId, employeeId: code } }));
  if (!externalId || (await taken(externalId))) {
    externalId = "";
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = `STF-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
      if (!(await taken(candidate))) {
        externalId = candidate;
        break;
      }
    }
  }
  if (!externalId) throw new HttpError(503, "unavailable", "A unique employee code could not be generated. Please try again.");
  const parts = name.split(" ");
  const designationName = clean(details.designation);
  let designationId: string | undefined;
  if (designationName) {
    const designation = await prisma.designation.findFirst({ where: { campusId, name: designationName } });
    designationId = designation?.id || (await prisma.designation.create({ data: { campusId, name: designationName } })).id;
  }
  try {
    const staff = await prisma.staff.create({
      data: {
        campusId,
        employeeId: externalId,
        firstName: clean(body.firstName) || parts[0] || name,
        lastName: clean(body.lastName) || parts.slice(1).join(" ") || null,
        email: lower(body.email) || null,
        phone: clean(body.contactNumber) || null,
        gender: mapGender(body.gender),
        joiningDate: parseDate(joiningText),
        isActive: !["inactive", "deactivated"].includes(clean(body.status).toLowerCase()),
        designationId,
      },
    });
    await writeProfile(campusId, staff.id, {
      personType: type,
      middleName: clean(body.middleName),
      dateOfBirth: clean(body.dateOfBirth),
      address: clean(body.address),
      city: clean(body.city),
      state: clean(body.state),
      alternateContactNumber: clean(body.alternateContactNumber),
      className: clean(body.className),
      section: clean(body.section),
      metadata,
    });
    return (await loadStaffPerson(campusId, staff.id)).person;
  } catch (error) {
    if (isUnique(error)) throw conflict("A staff member with this employee code already exists.");
    throw error;
  }
}

export async function patchPerson(campusId: string, personId: string, body: JsonRecord) {
  const loaded = await loadStaffPerson(campusId, personId);
  const profiles = await profilesByStaff(campusId);
  const profile = profiles.get(personId) || {};
  const data: Prisma.StaffUpdateInput = {};
  if (typeof body.fullName === "string" || typeof body.firstName === "string" || typeof body.lastName === "string") {
    const fullName = clean(body.fullName);
    const parts = fullName ? fullName.split(" ") : [];
    data.firstName = clean(body.firstName) || parts[0] || loaded.staff.firstName;
    data.lastName = typeof body.lastName === "string" ? clean(body.lastName) : parts.slice(1).join(" ") || loaded.staff.lastName;
  }
  if (typeof body.email === "string") data.email = lower(body.email) || null;
  if (typeof body.contactNumber === "string") data.phone = clean(body.contactNumber) || null;
  if (typeof body.externalId === "string" && clean(body.externalId)) data.employeeId = clean(body.externalId);
  if (typeof body.gender === "string") data.gender = mapGender(body.gender);
  if (typeof body.status === "string") {
    const status = clean(body.status);
    if (!["Active", "Inactive", "Deactivated"].includes(status)) {
      throw new HttpError(400, "validation_error", "Contact status must be Active or Inactive.");
    }
    data.isActive = status === "Active";
  }
  if (Object.keys(data).length) {
    try {
      await prisma.staff.update({ where: { id: personId }, data });
    } catch (error) {
      if (isUnique(error)) throw conflict("A staff member with this employee code already exists.");
      throw error;
    }
  }
  const metadata = body.metadata === undefined ? profile.metadata || {} : { ...(profile.metadata || {}), ...asObject(body.metadata) };
  const details = asObject(metadata.staffDetails);
  if (clean(details.designation)) {
    const designationName = clean(details.designation);
    const designation = await prisma.designation.findFirst({ where: { campusId, name: designationName } });
    const designationId = designation?.id || (await prisma.designation.create({ data: { campusId, name: designationName } })).id;
    await prisma.staff.update({ where: { id: personId }, data: { designationId } });
  }
  if (clean(details.joiningDate)) {
    await prisma.staff.update({ where: { id: personId }, data: { joiningDate: parseDate(details.joiningDate) } });
  }
  const nextType = typeof body.personType === "string" ? clean(body.personType).toLowerCase() : profile.personType;
  if (nextType && !["teacher", "staff", "parent", "day_care", "guardian", "other"].includes(nextType)) {
    throw new HttpError(400, "validation_error", "Choose a valid person type.");
  }
  await writeProfile(campusId, personId, {
    ...profile,
    personType: nextType || profile.personType || "staff",
    middleName: typeof body.middleName === "string" ? clean(body.middleName) : profile.middleName,
    dateOfBirth: typeof body.dateOfBirth === "string" ? clean(body.dateOfBirth) : profile.dateOfBirth,
    address: typeof body.address === "string" ? clean(body.address) : profile.address,
    city: typeof body.city === "string" ? clean(body.city) : profile.city,
    state: typeof body.state === "string" ? clean(body.state) : profile.state,
    alternateContactNumber: typeof body.alternateContactNumber === "string" ? clean(body.alternateContactNumber) : profile.alternateContactNumber,
    className: typeof body.className === "string" ? clean(body.className) : profile.className,
    section: typeof body.section === "string" ? clean(body.section) : profile.section,
    metadata,
  });
  return (await loadStaffPerson(campusId, personId)).person;
}

const userInclude = {
  roles: { include: { role: true } },
  staff: true,
} satisfies Prisma.UserInclude;

function userView(user: Prisma.UserGetPayload<{ include: typeof userInclude }>) {
  return {
    id: user.id,
    personId: user.staff?.id || null,
    email: user.email || user.username,
    role: accountRole(user.roles.map((item) => item.role.name), user.actorType),
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    linkedPerson: user.staff ? [user.staff.firstName, user.staff.lastName].filter(Boolean).join(" ") : null,
    personType: user.staff ? "staff" : null,
  };
}

export async function listUsers(campusId: string) {
  const users = await prisma.user.findMany({
    where: { campusId },
    include: userInclude,
    orderBy: { createdAt: "desc" },
  });
  return users.map(userView);
}

async function roleFor(campusId: string, schoolRole: string) {
  const name = ROLE_RECORD[schoolRole];
  if (!name) throw new HttpError(400, "validation_error", "Provide a valid school role.");
  const existing = await prisma.role.findFirst({ where: { campusId, name } });
  if (existing) return existing;
  return prisma.role.create({ data: { campusId, name, isSystem: false } });
}

async function replaceRole(userId: string, roleId: string) {
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.userRole.create({ data: { userId, roleId } });
}

export async function createUser(campusId: string, actorId: string, body: JsonRecord) {
  const email = lower(body.email);
  const password = String(body.password || "");
  const role = clean(body.role);
  if (!email.includes("@") || password.length < 10 || !SCHOOL_ROLES.includes(role as (typeof SCHOOL_ROLES)[number])) {
    throw new HttpError(400, "validation_error", "Provide a valid email, a password of at least 10 characters, and a school role.");
  }
  const personId = clean(body.personId);
  if (personId) {
    const staff = await prisma.staff.findFirst({ where: { id: personId, campusId } });
    if (!staff) throw new HttpError(404, "not_found", "Linked person does not belong to this school.");
    if (staff.userId) throw conflict("This person already has an active login account.");
  }
  const roleRow = await roleFor(campusId, role);
  try {
    const user = await prisma.user.create({
      data: {
        campusId,
        actorType: ActorType.STAFF,
        email,
        username: email,
        passwordHash: await bcrypt.hash(password, 12),
        firstName: clean(body.firstName),
        lastName: clean(body.lastName),
        mustChangePassword: true,
        roles: { create: { roleId: roleRow.id } },
      },
    });
    if (personId) await prisma.staff.update({ where: { id: personId }, data: { userId: user.id } });
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: userInclude });
    return userView(fresh);
  } catch (error) {
    if (isUnique(error)) throw conflict("That login is already in use.");
    throw error;
  }
  void actorId;
}

export async function patchUser(campusId: string, actorId: string, userId: string, body: JsonRecord) {
  const user = await prisma.user.findFirst({ where: { id: userId, campusId }, include: userInclude });
  if (!user) throw new HttpError(404, "not_found", "User account not found in this school.");
  if (typeof body.isActive === "boolean") {
    if (userId === actorId && !body.isActive) {
      throw new HttpError(400, "validation_error", "You cannot deactivate your own signed-in account.");
    }
    await prisma.user.update({ where: { id: userId }, data: { isActive: body.isActive } });
  } else if (typeof body.email === "string") {
    const email = lower(body.email);
    if (!email.includes("@")) throw new HttpError(400, "validation_error", "Provide a valid email address or phone-login identifier.");
    const username = user.username === user.email || user.username === (user.email || "").toLowerCase() ? email : user.username;
    try {
      await prisma.user.update({ where: { id: userId }, data: { email, username } });
    } catch (error) {
      if (isUnique(error)) throw conflict("That login is already in use.");
      throw error;
    }
  } else if (typeof body.role === "string") {
    const role = clean(body.role);
    if (!SCHOOL_ROLES.includes(role as (typeof SCHOOL_ROLES)[number])) {
      throw new HttpError(400, "validation_error", "Provide a valid school role.");
    }
    const roleRow = await roleFor(campusId, role);
    await replaceRole(userId, roleRow.id);
    if (role === "teacher" && user.staff) {
      const profiles = await profilesByStaff(campusId);
      const profile = profiles.get(user.staff.id) || {};
      await writeProfile(campusId, user.staff.id, { ...profile, personType: "teacher" });
    }
  } else {
    throw new HttpError(400, "validation_error", "Provide a role, email, or active status.");
  }
  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: userInclude });
  return userView(fresh);
}

export async function setUserPassword(campusId: string, userId: string, password: string, temporary = false) {
  if (password.length < 10) throw new HttpError(400, "validation_error", "Password must contain at least 10 characters.");
  const user = await prisma.user.findFirst({ where: { id: userId, campusId } });
  if (!user) throw new HttpError(404, "not_found", "User account not found in this school.");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true },
  });
  return temporary
    ? { ok: true, email: user.email || user.username, temporaryPassword: password, message: "Share this temporary password securely. The user must change it after signing in." }
    : { ok: true, message: "Password updated. The user must change it after signing in." };
}

export async function resetUserPassword(campusId: string, userId: string) {
  const temporaryPassword = randomBytes(12).toString("base64url");
  return setUserPassword(campusId, userId, temporaryPassword, true);
}

export async function bootstrap(principal: AuthPrincipal) {
  const [account, campus, years, classes, configRow] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: principal.id } }),
    prisma.campus.findUniqueOrThrow({ where: { id: principal.campusId } }),
    listAcademicYears(principal.campusId),
    listClasses(principal.campusId),
    prisma.setting.findUnique({ where: { campusId_key: { campusId: principal.campusId, key: CONFIG_KEY } } }),
  ]);
  return {
    school: {
      id: campus.id,
      name: campus.name,
      code: campus.code,
      phone: campus.phone || "",
      email: campus.email || "",
      address: campus.address || "",
      timezone: campus.timezone,
      config: asObject(configRow?.value),
    },
    academicYears: years,
    classes: classes
      .filter((row) => row.status !== "Inactive")
      .map((row) => ({
        ...row,
        class_name: row.name,
        className: row.name,
        grade_order: row.displayOrder,
        is_active: true,
      })),
    user: schoolWorldUser(principal, account, campus),
  };
}

export async function saveSchoolSettings(campusId: string, body: JsonRecord) {
  const campus = await prisma.campus.findUniqueOrThrow({ where: { id: campusId } });
  const current = await prisma.setting.findUnique({ where: { campusId_key: { campusId, key: CONFIG_KEY } } });
  const config = { ...asObject(current?.value), ...asObject(body.config) };
  const name = body.name === undefined ? undefined : clean(body.name);
  if (name !== undefined && name.length < 2) {
    throw new HttpError(400, "validation_error", "School name must contain at least 2 characters.");
  }
  const savedCampus = await prisma.campus.update({
    where: { id: campusId },
    data: {
      name: name || campus.name,
      phone: body.phone === undefined ? campus.phone : clean(body.phone) || null,
      email: body.email === undefined ? campus.email : lower(body.email) || null,
      address: body.address === undefined ? campus.address : clean(body.address) || null,
    },
  });
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: CONFIG_KEY } },
    update: { value: config as Prisma.InputJsonValue },
    create: { campusId, key: CONFIG_KEY, value: config as Prisma.InputJsonValue },
  });
  return {
    id: savedCampus.id,
    name: savedCampus.name,
    code: savedCampus.code,
    phone: savedCampus.phone || "",
    email: savedCampus.email || "",
    address: savedCampus.address || "",
    timezone: savedCampus.timezone,
    config,
  };
}

function studentStatus(value: unknown) {
  const text = clean(value).toLowerCase();
  if (text === "alumni") return StudentStatus.ALUMNI;
  if (text === "transferred") return StudentStatus.TRANSFERRED;
  if (text === "inactive" || text === "disabled") return StudentStatus.DISABLED;
  return StudentStatus.ACTIVE;
}

async function placeEnrollment(studentId: string, campusId: string, className: string, sectionName: string, academicYear: string, rollNo: string) {
  if (!clean(className) || !clean(academicYear)) return;
  const session = await ensureSession(campusId, academicYear);
  const place = await ensureClassSection(campusId, className, sectionName);
  const current = await prisma.studentEnrollment.findFirst({ where: { studentId, isCurrent: true } });
  if (current) {
    await prisma.studentEnrollment.update({
      where: { id: current.id },
      data: { sessionId: session.id, classId: place.classId, sectionId: place.sectionId, rollNo: rollNo || current.rollNo, isCurrent: true },
    });
    return;
  }
  await prisma.studentEnrollment.create({
    data: { studentId, sessionId: session.id, classId: place.classId, sectionId: place.sectionId, rollNo: rollNo || null, isCurrent: true },
  });
}

const studentInclude = {
  enrollments: { where: { isCurrent: true }, include: { class: true, section: true, session: true }, take: 1 },
  guardians: { include: { guardian: true } },
  addresses: true,
  house: true,
} satisfies Prisma.StudentInclude;

export function studentView(student: Prisma.StudentGetPayload<{ include: typeof studentInclude }>) {
  const enrollment = student.enrollments[0];
  const father = student.guardians.find((link) => link.relation === "father")?.guardian;
  const address = student.addresses[0];
  const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
  const photo = student.photoUrl && student.photoUrl.startsWith("data:image/") ? student.photoUrl : "";
  return {
    id: student.admissionNo,
    studentId: student.admissionNo,
    studentCode: student.admissionNo,
    studentDbId: student.id,
    name,
    fullName: name,
    className: enrollment?.class.name ?? "",
    class: enrollment?.class.name ?? "",
    section: enrollment?.section.name === "—" ? "" : enrollment?.section.name ?? "",
    academicYear: enrollment?.session.name ?? "",
    rollNumber: enrollment?.rollNo ?? student.rollNo ?? "",
    enrollmentNumber: student.enrollmentNo ?? "",
    gender: genderLabel(student.gender),
    dob: dateOnly(student.dob),
    phone: student.mobile ?? "",
    alternatePhone: student.alternatePhone ?? "",
    email: student.email ?? "",
    father: father?.name ?? "",
    fatherName: father?.name ?? "",
    parent: student.primaryParentName || father?.name || "",
    motherName: student.motherName ?? "",
    primaryParentName: student.primaryParentName ?? "",
    status: student.status === StudentStatus.ACTIVE ? "Active" : student.status === StudentStatus.ALUMNI ? "Alumni" : "Inactive",
    house: student.house?.name ?? "",
    bloodGroup: student.bloodGroup ?? "",
    feeDefaulter: student.feeDefaulter,
    defaulter: student.feeDefaulter,
    address: address?.line1 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    pinCode: student.pinCode ?? address?.pincode ?? "",
    photoDataUrl: photo,
    metadata: { erpStudentId: student.id },
  };
}

async function loadStudentRecord(campusId: string, code: string) {
  const student = await prisma.student.findFirst({
    where: { campusId, admissionNo: code },
    include: studentInclude,
  });
  if (!student) throw notFound("Student");
  return student;
}

async function applyStudentFields(campusId: string, studentId: string, body: JsonRecord) {
  const student = await prisma.student.findFirst({ where: { id: studentId, campusId } });
  if (!student) throw notFound("Student");
  const data: Prisma.StudentUpdateInput = {};
  const name = clean(body.name) || [body.firstName, body.middleName, body.lastName].map(clean).filter(Boolean).join(" ");
  if (name) {
    const parts = name.split(" ");
    data.firstName = clean(body.firstName) || parts[0] || student.firstName;
    if (typeof body.middleName === "string") data.middleName = clean(body.middleName) || null;
    data.lastName = typeof body.lastName === "string" ? clean(body.lastName) || null : parts.slice(1).join(" ") || student.lastName;
  }
  if (typeof body.phone === "string") data.mobile = clean(body.phone) || null;
  if (typeof body.email === "string") data.email = lower(body.email) || null;
  if (typeof body.alternatePhone === "string") data.alternatePhone = clean(body.alternatePhone) || null;
  if (typeof body.house === "string") {
    const houseName = clean(body.house);
    if (!houseName) {
      if (student.houseId) data.house = { disconnect: true };
    } else {
      const house = await prisma.house.upsert({
        where: { campusId_name: { campusId, name: houseName } },
        update: {},
        create: { campusId, name: houseName },
      });
      data.house = { connect: { id: house.id } };
    }
  }
  if (typeof body.bloodGroup === "string") data.bloodGroup = clean(body.bloodGroup) || null;
  if (typeof body.motherName === "string") data.motherName = clean(body.motherName) || null;
  if (typeof body.primaryParentName === "string" || typeof body.parent === "string") {
    data.primaryParentName = clean(body.primaryParentName || body.parent) || null;
  }
  if (typeof body.rollNumber === "string") data.rollNo = clean(body.rollNumber) || null;
  if (typeof body.enrollmentNumber === "string") data.enrollmentNo = clean(body.enrollmentNumber) || null;
  if (typeof body.dob === "string") data.dob = parseDate(body.dob);
  if (typeof body.gender === "string" && mapGender(body.gender)) data.gender = mapGender(body.gender);
  if (typeof body.status === "string") data.status = studentStatus(body.status);
  if (typeof body.feeDefaulter === "boolean" || typeof body.defaulter === "boolean") {
    data.feeDefaulter = Boolean(body.feeDefaulter ?? body.defaulter);
  }
  if (typeof body.photoDataUrl === "string") {
    const photo = body.photoDataUrl;
    if (photo && !photo.startsWith("data:image/")) throw new HttpError(400, "validation_error", "Student photo must be an image.");
    if (photo.length > 2_400_000) throw new HttpError(413, "payload_too_large", "Photo must be smaller than 1.8 MB after compression.");
    data.photoUrl = photo || null;
  }
  if (Object.keys(data).length) await prisma.student.update({ where: { id: studentId }, data });
  const father = clean(body.father || body.fatherName);
  if (father) {
    const link = await prisma.studentGuardian.findFirst({
      where: { studentId, relation: "father" },
      include: { guardian: true },
    });
    if (link) {
      await prisma.guardian.update({ where: { id: link.guardianId }, data: { name: father } });
    } else {
      const guardian = await prisma.guardian.create({ data: { name: father, phone: clean(body.phone) || null } });
      await prisma.studentGuardian.create({ data: { studentId, guardianId: guardian.id, relation: "father" } });
    }
  }
  if (typeof body.address === "string" || typeof body.city === "string" || typeof body.state === "string") {
    const address = await prisma.studentAddress.findFirst({ where: { studentId, kind: "permanent" } });
    const addressData = {
      line1: typeof body.address === "string" ? clean(body.address) || null : undefined,
      city: typeof body.city === "string" ? clean(body.city) || null : undefined,
      state: typeof body.state === "string" ? clean(body.state) || null : undefined,
      pincode: clean(body.pinCode || body.zip) || undefined,
    };
    if (address) await prisma.studentAddress.update({ where: { id: address.id }, data: addressData });
    else await prisma.studentAddress.create({ data: { studentId, kind: "permanent", ...addressData, line1: addressData.line1 || null } });
  }
  if (typeof body.className === "string" || typeof body.academicYear === "string" || typeof body.section === "string") {
    const fresh = await loadStudentRecord(campusId, student.admissionNo);
    const enrollment = fresh.enrollments[0];
    await placeEnrollment(
      studentId,
      campusId,
      typeof body.className === "string" ? clean(body.className) : enrollment?.class.name || "",
      typeof body.section === "string" ? clean(body.section) : enrollment?.section.name === "—" ? "" : enrollment?.section.name || "",
      typeof body.academicYear === "string" ? clean(body.academicYear) : enrollment?.session.name || "",
      typeof body.rollNumber === "string" ? clean(body.rollNumber) : enrollment?.rollNo || student.rollNo || "",
    );
  }
}

export async function createStudent(campusId: string, body: JsonRecord) {
  const name = clean(body.name) || [body.firstName, body.middleName, body.lastName].map(clean).filter(Boolean).join(" ");
  if (!name) throw new HttpError(400, "validation_error", "Student name is required.");
  const code = clean(body.studentId || body.studentCode || body.id) || `SW-${randomBytes(4).toString("hex").toUpperCase()}`;
  const existing = await prisma.student.findFirst({ where: { campusId, admissionNo: code } });
  if (existing) {
    await applyStudentFields(campusId, existing.id, { ...body, name });
    return { student: studentView(await loadStudentRecord(campusId, code)), created: false };
  }
  const parts = name.split(" ");
  const houseName = clean(body.house);
  const houseId = houseName
    ? (await prisma.house.upsert({
        where: { campusId_name: { campusId, name: houseName } },
        update: {},
        create: { campusId, name: houseName },
      })).id
    : null;
  const student = await prisma.student.create({
    data: {
      campusId,
      admissionNo: code,
      firstName: clean(body.firstName) || parts[0] || name,
      middleName: clean(body.middleName) || null,
      lastName: clean(body.lastName) || parts.slice(1).join(" ") || null,
      gender: mapGender(body.gender),
      mobile: clean(body.phone) || null,
      email: lower(body.email) || null,
      motherName: clean(body.motherName) || null,
      primaryParentName: clean(body.parent || body.primaryParentName) || null,
      rollNo: clean(body.rollNumber) || null,
      enrollmentNo: clean(body.enrollmentNumber) || null,
      houseId,
      bloodGroup: clean(body.bloodGroup) || null,
      status: studentStatus(body.status || "Active"),
      dob: parseDate(body.dob),
      details: body.details && typeof body.details === "object" ? (body.details as Prisma.InputJsonValue) : undefined,
    },
  });
  await applyStudentFields(campusId, student.id, body);
  return { student: studentView(await loadStudentRecord(campusId, code)), created: true };
}

export async function saveStudentDetails(campusId: string, code: string, body: JsonRecord) {
  const student = await loadStudentRecord(campusId, code);
  const details = body.details && typeof body.details === "object" ? body.details : student.details;
  await prisma.student.update({
    where: { id: student.id },
    data: { details: (details ?? {}) as Prisma.InputJsonValue },
  });
  if (body.student && typeof body.student === "object") {
    await applyStudentFields(campusId, student.id, asObject(body.student));
  }
  return studentView(await loadStudentRecord(campusId, code));
}

export async function listStudentDetails(campusId: string) {
  const rows = await prisma.student.findMany({
    where: { campusId },
    select: { admissionNo: true, details: true },
    take: 500,
  });
  return Object.fromEntries(rows.map((row) => [row.admissionNo, row.details || {}]));
}

export async function admitStudent(campusId: string, body: JsonRecord) {
  const studentInput = asObject(body.student);
  const parent = asObject(body.parent);
  const firstName = clean(studentInput.firstName);
  const middleName = clean(studentInput.middleName);
  const lastName = clean(studentInput.lastName);
  const studentName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  const academicYear = clean(studentInput.academicYear);
  const className = clean(studentInput.className);
  const relationship = clean(parent.relation);
  const parentPhone = clean(parent.phone);
  const phoneDigits = parentPhone.replace(/\D/g, "");
  const loginMethod = clean(parent.loginMethod) === "Email" ? "Email" : "Phone";
  const parentEmail = lower(parent.email);
  const password = String(parent.password || "");
  if (!firstName || !studentName) throw new HttpError(400, "validation_error", "Student first name is required.");
  if (!clean(studentInput.dob)) throw new HttpError(400, "validation_error", "Student date of birth is required.");
  if (!academicYear) throw new HttpError(400, "validation_error", "Academic year is required.");
  if (!className) throw new HttpError(400, "validation_error", "Class is required.");
  if (!relationship || relationship === "Not Specified") {
    throw new HttpError(400, "validation_error", "Select the primary parent relationship.");
  }
  const classes = await listClasses(campusId);
  const selected = classes.find((row) => row.status !== "Inactive" && row.name === className);
  if (!selected) throw new HttpError(400, "validation_error", "The selected class is not active. Refresh the page and choose an active class.");
  if (password.length < 6) throw new HttpError(400, "validation_error", "Parent password must contain at least 6 characters.");
  if (phoneDigits.length < 7) throw new HttpError(400, "validation_error", "Enter a valid primary parent phone number.");
  if (loginMethod === "Email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
    throw new HttpError(400, "validation_error", "Enter a valid parent email address.");
  }
  const nameOf = (prefix: string) => [parent[`${prefix}First`], parent[`${prefix}Middle`], parent[`${prefix}Last`]].map(clean).filter(Boolean).join(" ");
  const motherName = nameOf("mother");
  const fatherName = nameOf("father");
  const guardianName = nameOf("guardian");
  const primaryParentName = relationship === "Mother" ? motherName : relationship === "Father" ? fatherName : relationship === "Guardian" ? guardianName : motherName || fatherName || guardianName;
  if (!primaryParentName) throw new HttpError(400, "validation_error", "Enter the first name for the selected primary parent or guardian.");
  const parentSafe = { ...parent };
  delete parentSafe.password;
  const username = loginMethod === "Email" ? parentEmail : phoneDigits;
  const existingLogin = await prisma.user.findFirst({ where: { campusId, username } });
  if (existingLogin && existingLogin.actorType !== ActorType.GUARDIAN) {
    throw conflict("That parent login is already used by another account.");
  }
  const code = clean(studentInput.studentCode) || `SW-${randomBytes(4).toString("hex").toUpperCase()}`;
  const created = await createStudent(campusId, {
    ...studentInput,
    studentId: code,
    name: studentName,
    className,
    section: selected.section,
    academicYear,
    phone: parentPhone,
    parent: primaryParentName,
    father: fatherName,
    motherName,
    primaryParentName,
    photoDataUrl: studentInput.photoDataUrl,
    details: {
      student: { ...studentInput, photoDataUrl: undefined },
      parent: parentSafe,
      fees: asObject(body.fees),
      dayCare: asObject(body.dayCare),
      transport: asObject(body.transport),
      immunizationSchedule: Array.isArray(body.immunizationSchedule) ? body.immunizationSchedule : [],
    },
  });
  const existingUser = existingLogin;
  let parentAccountCreated = false;
  let parentAccountReused = false;
  const student = await prisma.student.findFirstOrThrow({ where: { campusId, admissionNo: code } });
  if (existingUser?.actorType === ActorType.GUARDIAN) {
    parentAccountReused = true;
    const guardian = await prisma.guardian.findUnique({ where: { userId: existingUser.id } });
    if (guardian) {
      const linked = await prisma.studentGuardian.findFirst({
        where: { studentId: student.id, guardianId: guardian.id },
      });
      if (!linked) {
        await prisma.studentGuardian.create({
          data: { studentId: student.id, guardianId: guardian.id, relation: relationship.toLowerCase() },
        });
      }
    }
  } else {
    const parentRole = await prisma.role.findFirst({ where: { campusId, name: "Parent" } })
      || await prisma.role.create({ data: { campusId, name: "Parent", isSystem: true } });
    const user = await prisma.user.create({
      data: {
        campusId,
        actorType: ActorType.GUARDIAN,
        username,
        email: parentEmail || null,
        phone: parentPhone,
        passwordHash: await bcrypt.hash(password, 12),
        firstName: primaryParentName.split(" ")[0] || primaryParentName,
        lastName: primaryParentName.split(" ").slice(1).join(" "),
        mustChangePassword: false,
        roles: { create: { roleId: parentRole.id } },
      },
    });
    const guardian = await prisma.guardian.create({
      data: { userId: user.id, name: primaryParentName, phone: parentPhone, email: parentEmail || null },
    });
    await prisma.studentGuardian.create({
      data: { studentId: student.id, guardianId: guardian.id, relation: relationship.toLowerCase() },
    });
    parentAccountCreated = true;
  }
  return {
    ok: true,
    student: studentView(await loadStudentRecord(campusId, code)),
    parentAccountCreated,
    parentAccountReused,
  };
  void created;
}

export async function importStudents(campusId: string, rows: unknown[]) {
  if (!Array.isArray(rows) || rows.length > 500) {
    throw new HttpError(400, "validation_error", "Send up to 500 student rows.");
  }
  let created = 0;
  let updated = 0;
  for (const raw of rows) {
    const row = asObject(raw);
    const result = await createStudent(campusId, {
      ...row,
      name: clean(row.name) || [row.firstName, row.middleName, row.lastName].map(clean).filter(Boolean).join(" "),
      studentId: clean(row.studentId || row.studentCode || row.StudentID),
      className: clean(row.className || row.Class || row.class),
      section: clean(row.section || row.Section),
      academicYear: clean(row.academicYear || row.AcademicYear),
      phone: clean(row.phone || row.ParentPhone || row.parentPhone),
      father: clean(row.father || row.FatherName),
      parent: clean(row.parent || row.ParentName),
    });
    if (result.created) created += 1;
    else updated += 1;
  }
  return { ok: true, created, updated, total: rows.length };
}

export async function listStaffCategories(campusId: string) {
  const rows = await prisma.staffCategory.findMany({
    where: { campusId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
  }));
}

export async function saveStaffCategory(campusId: string, body: JsonRecord, categoryId?: string) {
  const name = body.name === undefined ? "" : clean(body.name);
  const description = body.description === undefined ? "" : clean(body.description);
  if (!categoryId && !name) throw new HttpError(400, "validation_error", "Staff category name is required.");
  if (name.length > 100) throw new HttpError(400, "validation_error", "Staff category name must be 100 characters or fewer.");
  if (description.length > 500) throw new HttpError(400, "validation_error", "Description must be 500 characters or fewer.");
  try {
    if (!categoryId) {
      const row = await prisma.staffCategory.create({ data: { campusId, name, description } });
      return { id: row.id, name: row.name, description: row.description, isActive: row.isActive };
    }
    const existing = await prisma.staffCategory.findFirst({ where: { id: categoryId, campusId } });
    if (!existing) throw new HttpError(404, "not_found", "Staff category not found.");
    const row = await prisma.staffCategory.update({
      where: { id: categoryId },
      data: {
        name: body.name === undefined ? existing.name : name,
        description: body.description === undefined ? existing.description : description,
        isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      },
    });
    return { id: row.id, name: row.name, description: row.description, isActive: row.isActive };
  } catch (error) {
    if (isUnique(error)) throw conflict("A staff category with this name already exists.");
    throw error;
  }
}

export async function listCategoryAssignments(campusId: string) {
  const rows = await prisma.staffCategoryAssignment.findMany({
    where: { category: { campusId } },
    include: { category: true },
  });
  return rows.map((row) => ({
    personId: row.staffId,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    categoryActive: row.category.isActive,
  }));
}

export async function assignStaffCategory(campusId: string, personId: string, categoryId: string) {
  const staff = await prisma.staff.findFirst({ where: { id: personId, campusId } });
  if (!staff) throw new HttpError(404, "not_found", "Staff member not found.");
  await prisma.staffCategoryAssignment.deleteMany({ where: { staffId: personId } });
  if (!categoryId) return { ok: true, personId, categoryId: null };
  const category = await prisma.staffCategory.findFirst({ where: { id: categoryId, campusId } });
  if (!category) throw new HttpError(400, "validation_error", "Choose a staff category created in Manage Staff Category.");
  if (!category.isActive) throw new HttpError(400, "validation_error", "Choose an active staff category.");
  await prisma.staffCategoryAssignment.create({ data: { staffId: personId, categoryId: category.id } });
  return { ok: true, personId, categoryId: category.id, categoryName: category.name };
}

export async function listCommunicationCategories(campusId: string) {
  const [categories, blocked] = await Promise.all([
    prisma.staffCategory.findMany({ where: { campusId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.communicationCategoryRestriction.findMany({ where: { campusId, channel: "parents" } }),
  ]);
  const blockedIds = new Set(blocked.map((row) => row.categoryId));
  return categories.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    parentsBlocked: blockedIds.has(row.id),
  }));
}

export async function saveCommunicationBlocks(campusId: string, ids: unknown) {
  const requested = [...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)))];
  if (requested.length > 500) throw new HttpError(413, "payload_too_large", "Choose no more than 500 staff categories.");
  const active = await prisma.staffCategory.findMany({ where: { campusId, isActive: true }, select: { id: true } });
  const allowed = new Set(active.map((row) => row.id));
  if (requested.some((id) => !allowed.has(id))) {
    throw conflict("A selected category is no longer active. Refresh the page and try again.");
  }
  await prisma.communicationCategoryRestriction.deleteMany({ where: { campusId, channel: "parents" } });
  if (requested.length) {
    await prisma.communicationCategoryRestriction.createMany({
      data: requested.map((categoryId) => ({ campusId, categoryId, channel: "parents" })),
    });
  }
  return { ok: true };
}

export async function listRoutes(campusId: string, detailed: boolean) {
  const rows = await prisma.schoolRoute.findMany({
    where: { campusId, isActive: true },
    orderBy: { name: "asc" },
  });
  if (!detailed) return rows.map((row) => row.name);
  return rows.map((row) => ({
    name: row.name,
    stops: row.stops,
    vehicle: row.vehicleNumber,
    driver: row.driverName,
  }));
}

export async function saveRoute(campusId: string, body: JsonRecord) {
  const name = clean(body.name);
  if (!name) throw new HttpError(400, "validation_error", "Route name is required.");
  const row = await prisma.schoolRoute.upsert({
    where: { campusId_name: { campusId, name } },
    update: {
      stops: body.stops === undefined ? undefined : clean(body.stops),
      vehicleNumber: body.vehicle === undefined ? undefined : clean(body.vehicle),
      driverName: body.driver === undefined ? undefined : clean(body.driver),
      isActive: true,
    },
    create: {
      campusId,
      name,
      stops: clean(body.stops),
      vehicleNumber: clean(body.vehicle),
      driverName: clean(body.driver),
    },
  });
  return { name: row.name, stops: row.stops, vehicle: row.vehicleNumber, driver: row.driverName };
}

export async function renameRoute(campusId: string, oldName: string, nextName: string) {
  const name = clean(nextName);
  if (!name) throw new HttpError(400, "validation_error", "Route name is required.");
  const existing = await prisma.schoolRoute.findUnique({ where: { campusId_name: { campusId, name: oldName } } });
  if (!existing) throw new HttpError(404, "not_found", "Route not found.");
  try {
    const row = await prisma.schoolRoute.update({ where: { id: existing.id }, data: { name } });
    return row.name;
  } catch (error) {
    if (isUnique(error)) throw conflict("A route with that name already exists.");
    throw error;
  }
}

export async function deactivateRoute(campusId: string, name: string) {
  const existing = await prisma.schoolRoute.findUnique({ where: { campusId_name: { campusId, name } } });
  if (!existing) throw new HttpError(404, "not_found", "Route not found.");
  await prisma.schoolRoute.update({ where: { id: existing.id }, data: { isActive: false } });
}

function decodeDataUrl(dataUrl: unknown) {
  const match = String(dataUrl || "").match(/^data:([^;,]+)?(?:;base64)?,([\s\S]+)$/);
  if (!match) throw new HttpError(400, "validation_error", "Attachment must be a file data URL.");
  const buffer = Buffer.from(match[2], "base64");
  return { mime: match[1] || "application/octet-stream", buffer };
}

export async function messageRecipients(campusId: string) {
  const users = await prisma.user.findMany({
    where: { campusId, isActive: true },
    include: { roles: { include: { role: true } }, staff: true, student: { include: { enrollments: { where: { isCurrent: true }, include: { class: true, section: true }, take: 1 } } }, guardian: { include: { links: { include: { student: { include: { enrollments: { where: { isCurrent: true }, include: { class: true }, take: 1 } } } } } } } },
  });
  const people = [];
  const counts: Record<string, number> = {};
  for (const user of users) {
    const role = accountRole(user.roles.map((item) => item.role.name), user.actorType);
    if (!["parent", "student", "teacher", "staff", "school_admin", "principal", "transport_admin"].includes(role)) continue;
    const personId = user.staff?.id || user.student?.id || user.guardian?.id || user.id;
    const enrollment = user.student?.enrollments[0];
    const childNames = user.guardian?.links.map((link) => [link.student.firstName, link.student.lastName].filter(Boolean).join(" ")).join(", ") || "";
    const childClasses = user.guardian?.links.map((link) => link.student.enrollments[0]?.class.name || "").filter(Boolean).join(", ") || "";
    people.push({
      personId,
      userId: user.id,
      personType: role,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
      contactNumber: user.phone || user.staff?.phone || "",
      email: user.email || "",
      className: enrollment?.class.name || "",
      section: enrollment?.section.name === "—" ? "" : enrollment?.section.name || "",
      accountRoles: role,
      childNames,
      childClasses,
      status: "Active",
      canReceiveMessage: true,
    });
    counts[role] = (counts[role] || 0) + 1;
  }
  const classNames = [...new Set(people.map((person) => person.className).filter(Boolean))].sort();
  const broadcastLists = [
    { key: "all_parents", label: "All Parents", count: counts.parent || 0 },
    { key: "all_students", label: "All Students", count: counts.student || 0 },
    { key: "all_teachers", label: "All Teachers", count: counts.teacher || 0 },
    { key: "all_staff", label: "All Staff", count: (counts.staff || 0) + (counts.transport_admin || 0) + (counts.school_admin || 0) + (counts.principal || 0) },
    { key: "all_recipients", label: "All Active Recipients", count: people.length },
    ...classNames.map((className) => ({ key: `class:${className}`, label: `${className} — Parents & Students`, className })),
  ];
  return { people, broadcastLists };
}

function broadcastRoles(key: string) {
  if (key === "all_parents") return ["parent"];
  if (key === "all_students") return ["student"];
  if (key === "all_teachers") return ["teacher"];
  if (key === "all_staff") return ["staff", "transport_admin", "school_admin", "principal"];
  if (key === "all_recipients") return ["parent", "student", "teacher", "staff", "transport_admin", "school_admin", "principal"];
  return null;
}

export async function postMessage(campusId: string, senderId: string, body: JsonRecord) {
  const text = String(body.body || "").trim();
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const recipientPersonIds = [...new Set((Array.isArray(body.recipientPersonIds) ? body.recipientPersonIds : []).map(String))];
  const broadcastList = clean(body.broadcastList);
  if (!text && !attachments.length) throw new HttpError(400, "validation_error", "Write a message or attach a file before posting.");
  if (attachments.length > 5) throw new HttpError(413, "payload_too_large", "A message can contain up to 5 attachments.");
  if ((recipientPersonIds.length && broadcastList) || (!recipientPersonIds.length && !broadcastList)) {
    throw new HttpError(400, "validation_error", "Choose individual contacts or one broadcast list.");
  }
  let scheduleAt: Date | null = null;
  if (body.scheduleAt) {
    scheduleAt = new Date(String(body.scheduleAt));
    if (Number.isNaN(scheduleAt.getTime()) || scheduleAt.getTime() <= Date.now()) {
      throw new HttpError(400, "validation_error", "The scheduled date and time must be in the future.");
    }
  }
  const files = attachments.map((file) => {
    const item = asObject(file);
    const decoded = decodeDataUrl(item.dataUrl);
    return { name: clean(item.name) || "attachment", ...decoded };
  });
  const total = files.reduce((sum, file) => sum + file.buffer.length, 0);
  if (files.some((file) => file.buffer.length > 5 * 1024 * 1024) || total > 5 * 1024 * 1024) {
    throw new HttpError(413, "payload_too_large", "Message attachments are limited to 5 MB total.");
  }
  const directory = await messageRecipients(campusId);
  let recipients = directory.people.filter((person) => person.userId !== senderId);
  if (broadcastList.startsWith("class:")) {
    const className = clean(broadcastList.slice(6));
    recipients = recipients.filter((person) => ["parent", "student"].includes(person.personType) && (person.className === className || String(person.childClasses).includes(className)));
  } else if (broadcastList) {
    const roles = broadcastRoles(broadcastList);
    if (!roles) throw new HttpError(400, "validation_error", "Choose a supported broadcast list.");
    recipients = recipients.filter((person) => roles.includes(person.personType));
  } else {
    const selected = new Set(recipientPersonIds);
    recipients = recipients.filter((person) => selected.has(person.personId) || selected.has(person.userId));
    if (recipients.length !== recipientPersonIds.length) {
      throw conflict("One or more selected contacts no longer have an active recipient login. Refresh the contact list and try again.");
    }
  }
  const recipientIds = [...new Set(recipients.map((person) => person.userId))];
  if (!recipientIds.length) throw conflict("No active recipient accounts were found for that selection.");
  const id = randomUUID();
  await prisma.message.create({
    data: {
      id,
      batchId: id,
      campusId,
      senderId,
      subject: clean(body.subject) || "Message from School World",
      body: text,
      status: scheduleAt ? "scheduled" : "sent",
      scheduledAt: scheduleAt,
      recipients: { create: recipientIds.map((userId) => ({ userId })) },
      attachments: {
        create: files.map((file) => ({
          fileName: file.name,
          contentType: file.mime,
          fileSize: file.buffer.length,
          fileData: file.buffer,
        })),
      },
    },
  });
  const message = scheduleAt
    ? `Message scheduled for ${recipientIds.length} recipient account(s).`
    : `Message posted to ${recipientIds.length} recipient account(s).`;
  return { ok: true, batchId: id, recipientCount: recipientIds.length, status: scheduleAt ? "scheduled" : "sent", message };
}

export async function listMessages(campusId: string, userId: string, folder: string) {
  const sent = folder === "sent";
  const rows = await prisma.message.findMany({
    where: sent
      ? { campusId, senderId: userId }
      : { campusId, status: "sent", recipients: { some: { userId } } },
    include: {
      recipients: true,
      attachments: { select: { id: true, fileName: true, contentType: true, fileSize: true } },
    },
    orderBy: { sentAt: "desc" },
    take: 200,
  });
  const userIds = [...new Set(rows.flatMap((row) => [row.senderId, ...row.recipients.map((item) => item.userId)]).filter((id): id is string => Boolean(id)))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, include: { staff: true } });
  const byId = new Map(users.map((user) => [user.id, user]));
  const label = (id: string | null) => {
    const user = id ? byId.get(id) : undefined;
    if (!user) return "School user";
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.staff?.firstName || user.email || user.username;
  };
  return rows.map((row) => {
    const mine = row.recipients.find((item) => item.userId === userId);
    return {
      id: sent ? row.batchId : row.id,
      batchId: row.batchId,
      subject: row.subject,
      body: row.body,
      sentAt: row.sentAt,
      scheduledAt: row.scheduledAt,
      status: row.status,
      readAt: mine?.readAt || null,
      senderName: label(row.senderId),
      senderChildInfo: "",
      recipientCount: row.recipients.length,
      recipients: row.recipients.map((item) => label(item.userId)),
      attachments: row.attachments.map((file) => ({
        id: file.id,
        name: file.fileName,
        type: file.contentType,
        size: file.fileSize,
        downloadUrl: `/api/messages/${row.batchId}/attachments/${file.id}`,
      })),
    };
  });
}

export async function markMessageRead(campusId: string, userId: string, messageId: string) {
  const message = await prisma.message.findFirst({
    where: { campusId, OR: [{ id: messageId }, { batchId: messageId }] },
  });
  if (!message) throw new HttpError(404, "not_found", "Message not found.");
  await prisma.messageRecipient.updateMany({
    where: { messageId: message.id, userId },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

export async function deleteMessage(campusId: string, userId: string, messageId: string) {
  const message = await prisma.message.findFirst({
    where: { campusId, OR: [{ id: messageId }, { batchId: messageId }] },
    include: { recipients: true },
  });
  if (!message) throw new HttpError(404, "not_found", "Message not found.");
  if (message.senderId === userId) {
    await prisma.message.delete({ where: { id: message.id } });
    return;
  }
  await prisma.messageRecipient.deleteMany({ where: { messageId: message.id, userId } });
}

export async function messageAttachment(campusId: string, userId: string, batchId: string, attachmentId: string) {
  const message = await prisma.message.findFirst({
    where: { campusId, batchId, OR: [{ senderId: userId }, { recipients: { some: { userId } } }] },
    include: { attachments: { where: { id: attachmentId } } },
  });
  const file = message?.attachments[0];
  if (!file) throw new HttpError(404, "not_found", "Message attachment not found in this account.");
  return file;
}

export async function listQuestionnaires(campusId: string) {
  const rows = await prisma.screenRecord.findMany({
    where: { campusId, screenKey: QUESTION_KEY },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => asObject(row.payload)).filter((item) => item.active !== false);
}

export async function saveQuestionnaire(campusId: string, body: JsonRecord, questionnaireId?: string) {
  const payload = asObject(body.questionnaire || body);
  const title = clean(payload.title);
  if (!title) throw new HttpError(400, "validation_error", "Questionnaire title is required.");
  const id = questionnaireId || clean(payload.id) || randomUUID();
  if (questionnaireId) {
    const existing = await prisma.screenRecord.findFirst({ where: { campusId, screenKey: QUESTION_KEY, title: questionnaireId } });
    if (!existing) throw new HttpError(404, "not_found", "Questionnaire not found.");
  }
  const saved = { ...payload, id, title, active: true, updatedAt: new Date().toISOString() };
  const existing = await prisma.screenRecord.findFirst({ where: { campusId, screenKey: QUESTION_KEY, title: id } });
  if (existing) {
    await prisma.screenRecord.update({ where: { id: existing.id }, data: { payload: saved as Prisma.InputJsonValue } });
  } else {
    await prisma.screenRecord.create({
      data: { campusId, screenKey: QUESTION_KEY, title: id, payload: saved as Prisma.InputJsonValue },
    });
  }
  return saved;
}

export async function getQuestionnaire(campusId: string, id: string) {
  const row = await prisma.screenRecord.findFirst({ where: { campusId, screenKey: QUESTION_KEY, title: id } });
  if (!row) throw new HttpError(404, "not_found", "Questionnaire not found.");
  return asObject(row.payload);
}

export async function optionalSubjectRoster(campusId: string, classId: string, academicYear: string) {
  if (!classId || !academicYear) throw new HttpError(400, "validation_error", "Choose a class and academic year.");
  const classes = await listClasses(campusId);
  const schoolClass = classes.find((row) => row.id === classId && row.status !== "Inactive");
  if (!schoolClass) throw new HttpError(404, "not_found", "Active class was not found. Refresh Performance Report and try again.");
  const subjects = schoolClass.subjectMappings
    .filter((item) => item.optional && item.enabled !== false)
    .map((item) => ({ id: String(item.subjectId || item.subjectName), name: String(item.subjectName || ""), code: "" }));
  const allowed = new Set(subjects.map((item) => item.id));
  const sectionName = schoolClass.section || "—";
  const students = await prisma.student.findMany({
    where: {
      campusId,
      status: StudentStatus.ACTIVE,
      enrollments: {
        some: {
          isCurrent: true,
          session: { name: academicYear },
          class: { name: schoolClass.name },
          section: { name: sectionName },
        },
      },
    },
    include: studentInclude,
    orderBy: { firstName: "asc" },
    take: 500,
  });
  const bag = await readBag(campusId, OPTIONAL_KEY);
  const selections = asObject(bag.selections);
  return {
    class: { id: schoolClass.id, name: schoolClass.name, section: schoolClass.section, displayName: schoolClass.displayName },
    academicYear,
    subjects,
    students: students.map((student) => {
      const view = studentView(student);
      const key = `${classId}|${academicYear}|${student.id}`;
      const selected = Array.isArray(selections[key]) ? (selections[key] as unknown[]).map(String).filter((id) => allowed.has(id)) : [];
      return { ...view, selectedSubjectIds: selected };
    }),
  };
}

export async function saveOptionalSubjects(campusId: string, studentId: string, body: JsonRecord) {
  const classId = clean(body.classId);
  const academicYear = clean(body.academicYear);
  const subjectIds = Array.isArray(body.subjectIds) ? body.subjectIds.map(String) : [];
  const roster = await optionalSubjectRoster(campusId, classId, academicYear);
  const allowed = new Set(roster.subjects.map((item) => item.id));
  if (subjectIds.some((id) => !allowed.has(id))) {
    throw new HttpError(400, "validation_error", "Every selected subject must be an active optional subject mapped to the chosen class.");
  }
  const student = await prisma.student.findFirst({ where: { campusId, OR: [{ id: studentId }, { admissionNo: studentId }] } });
  if (!student) throw notFound("Student");
  const bag = await readBag(campusId, OPTIONAL_KEY);
  const selections = asObject(bag.selections);
  selections[`${classId}|${academicYear}|${student.id}`] = subjectIds;
  await writeBag(campusId, OPTIONAL_KEY, { selections });
  return { ok: true, studentId: student.id, classId, academicYear, subjectIds };
}

export async function listExternalLinks(campusId: string) {
  const bag = await readBag(campusId, LINK_KEY);
  return Array.isArray(bag.links) ? bag.links.map((item) => asObject(item)) : [];
}

export async function saveExternalLink(campusId: string, body: JsonRecord, linkId?: string) {
  const url = clean(body.url);
  if (!url) throw new HttpError(400, "validation_error", "Link URL is required.");
  const links = await listExternalLinks(campusId);
  const id = linkId || randomUUID();
  if (linkId && !links.some((link) => String(link.id) === linkId)) throw new HttpError(404, "not_found", "External link not found.");
  const saved = { ...body, id, url, updatedAt: new Date().toISOString() };
  const next = linkId ? links.map((link) => (String(link.id) === linkId ? saved : link)) : [saved, ...links];
  await writeBag(campusId, LINK_KEY, { links: next });
  return saved;
}

export async function deleteExternalLink(campusId: string, linkId: string) {
  const links = await listExternalLinks(campusId);
  if (!links.some((link) => String(link.id) === linkId)) throw new HttpError(404, "not_found", "External link not found.");
  await writeBag(campusId, LINK_KEY, { links: links.filter((link) => String(link.id) !== linkId) });
}

export async function externalLinkGrades(campusId: string) {
  const classes = await listClasses(campusId);
  return classes.map((row, index) => ({
    id: row.id,
    className: row.displayName || [row.name, row.section].filter(Boolean).join(" "),
    baseClassName: row.name,
    section: row.section,
    gradeOrder: row.displayOrder || index + 1,
    isActive: row.status !== "Inactive",
  }));
}

const ENQUIRY_STATUSES = new Set(["Cold Enquiry", "Warm Enquiry", "Hot Enquiry", "Admitted", "Not Interested"]);

export async function listAdmissions(campusId: string) {
  const rows = await prisma.admissionEnquiry.findMany({
    where: { campusId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return rows.map(admissionView);
}

function admissionView(row: {
  id: string;
  formNumber: string;
  academicYear: string;
  enquiryDate: Date | null;
  enquiryStatus: string;
  studentName: string;
  primaryContact: string;
  email: string | null;
  classApplied: string | null;
  data: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...asObject(row.data),
    id: row.id,
    formNumber: row.formNumber,
    academicYear: row.academicYear,
    enquiryDate: dateOnly(row.enquiryDate),
    enquiryStatus: row.enquiryStatus,
    studentName: row.studentName,
    primaryContact: row.primaryContact,
    email: row.email,
    classApplied: row.classApplied,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createAdmission(campusId: string, userId: string, body: JsonRecord) {
  const studentName = clean(body.studentName);
  const primaryContact = clean(body.primaryContact);
  const academicYear = clean(body.academicYear);
  const enquiryStatus = clean(body.enquiryStatus) || "Cold Enquiry";
  if (studentName.length < 2 || !primaryContact || !academicYear) {
    throw new HttpError(400, "validation_error", "Student name, primary contact number, and academic year are required.");
  }
  if (!ENQUIRY_STATUSES.has(enquiryStatus)) throw new HttpError(400, "validation_error", "Choose a valid enquiry status.");
  const formNumber = clean(body.formNumber) || `ENQ-${randomBytes(4).toString("hex").toUpperCase()}`;
  const stored = { ...body };
  delete stored.photoDataUrl;
  try {
    const row = await prisma.admissionEnquiry.create({
      data: {
        campusId,
        formNumber,
        academicYear,
        enquiryDate: parseDate(body.enquiryDate),
        enquiryStatus,
        studentName,
        primaryContact,
        email: lower(body.email) || null,
        classApplied: clean(body.classApplied) || null,
        data: stored as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
    return admissionView(row);
  } catch (error) {
    if (isUnique(error)) throw conflict("That enquiry form number already exists.");
    throw error;
  }
}
