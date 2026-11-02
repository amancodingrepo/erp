import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";

export const CUSTOM_FIELD_BELONG_TO = [
  "Student",
  "Staff",
  "Admission",
  "Enquiry",
  "Documents",
  "Liberal Art",
] as const;

export const CUSTOM_FIELD_TYPES = [
  "Input",
  "Number",
  "Textarea",
  "Dropdown",
  "Date",
  "Checkbox",
] as const;

export type CustomFieldBelongTo = (typeof CUSTOM_FIELD_BELONG_TO)[number];
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

function trim(value: unknown) {
  return String(value ?? "").trim();
}

const BELONG_ALIASES: Record<string, CustomFieldBelongTo> = {
  student: "Student",
  students: "Student",
  staff: "Staff",
  admission: "Admission",
  enquiry: "Enquiry",
  documents: "Documents",
  "liberal art": "Liberal Art",
  liberalart: "Liberal Art",
};

const TYPE_ALIASES: Record<string, CustomFieldType> = {
  input: "Input",
  text: "Input",
  number: "Number",
  textarea: "Textarea",
  dropdown: "Dropdown",
  select: "Dropdown",
  date: "Date",
  checkbox: "Checkbox",
};

export function normalizeBelongTo(value: unknown): CustomFieldBelongTo {
  const raw = trim(value);
  if (!raw) throw validationError({ belongTo: "required" });
  const found = BELONG_ALIASES[raw.toLowerCase()];
  if (!found) throw validationError({ belongTo: "unknown" });
  return found;
}

export function normalizeFieldType(value: unknown): CustomFieldType {
  const raw = trim(value);
  if (!raw) throw validationError({ type: "required" });
  const found = TYPE_ALIASES[raw.toLowerCase()];
  if (!found) throw validationError({ type: "unknown" });
  return found;
}

export type CustomFieldPatch = {
  belongTo?: CustomFieldBelongTo;
  type?: CustomFieldType;
  name?: string;
  values?: string | null;
  columnSpan?: number;
  required?: boolean;
  visible?: boolean;
  onTable?: boolean;
  validation?: string | null;
};

export function customFieldPatch(patch: {
  belongTo?: unknown;
  type?: unknown;
  name?: unknown;
  values?: unknown;
  columnSpan?: unknown;
  required?: unknown;
  visible?: unknown;
  onTable?: unknown;
  validation?: unknown;
}): CustomFieldPatch {
  const data: CustomFieldPatch = {};
  if (patch.belongTo !== undefined) data.belongTo = normalizeBelongTo(patch.belongTo);
  if (patch.type !== undefined) data.type = normalizeFieldType(patch.type);
  if (patch.name !== undefined) {
    const name = trim(patch.name);
    if (!name) throw validationError({ name: "required" });
    data.name = name;
  }
  if (patch.values !== undefined) {
    const values = trim(patch.values);
    data.values = values || null;
  }
  if (patch.columnSpan !== undefined) {
    const n = Number(patch.columnSpan);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      throw validationError({ columnSpan: "1-12" });
    }
    data.columnSpan = n;
  }
  if (patch.required !== undefined) data.required = Boolean(patch.required);
  if (patch.visible !== undefined) data.visible = Boolean(patch.visible);
  if (patch.onTable !== undefined) data.onTable = Boolean(patch.onTable);
  if (patch.validation !== undefined) {
    const validation = trim(patch.validation);
    data.validation = validation || null;
  }
  return data;
}

async function fieldInCampus(campusId: string, fieldId: string) {
  const row = await prisma.customField.findFirst({
    where: { id: fieldId, campusId },
  });
  if (!row) throw notFound("custom field");
  return row;
}

export async function saveCustomField(
  campusId: string,
  fieldId: string,
  patch: Parameters<typeof customFieldPatch>[0],
) {
  const existing = await fieldInCampus(campusId, fieldId);
  const data = customFieldPatch(patch);
  return prisma.customField.update({
    where: { id: existing.id },
    data,
  });
}

export async function deleteCustomField(campusId: string, fieldId: string) {
  const existing = await fieldInCampus(campusId, fieldId);
  const used = await prisma.customFieldValue.count({
    where: { fieldId: existing.id },
  });
  if (used > 0) throw conflict("custom field has values");
  await prisma.customField.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}
