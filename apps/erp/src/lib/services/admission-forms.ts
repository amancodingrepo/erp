import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";

export const FORMS_SETTING_KEY = "admission.forms";

export type FormKind = "admission" | "enquiry";
export type FormStatus = "open" | "hidden";

export type AdmissionFormWindow = {
  id: string;
  name: string;
  kind: FormKind;
  status: FormStatus;
  belongTo: string;
  opensAt?: string | null;
  closesAt?: string | null;
};

export type TemplateField = {
  id: string;
  name: string;
  required: boolean;
  type?: string | null;
  values?: string | null;
  columnSpan?: number;
};

export function belongToForKind(kind: string) {
  return kind === "enquiry" ? "Enquiry" : "Admission";
}

export function parseKind(raw: unknown): FormKind {
  return raw === "enquiry" ? "enquiry" : "admission";
}

export function parseStatus(raw: unknown): FormStatus {
  return raw === "hidden" ? "hidden" : "open";
}

function asIsoDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const text = String(raw).trim();
  return text || null;
}

export function parseAdmissionForms(value: unknown): AdmissionFormWindow[] {
  if (!Array.isArray(value)) return [];
  const out: AdmissionFormWindow[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const name = String(rec.name ?? "").trim();
    if (!name) continue;
    const kind = parseKind(rec.kind);
    out.push({
      id: String(rec.id ?? "").trim() || `form_${out.length + 1}`,
      name,
      kind,
      status: parseStatus(rec.status),
      belongTo: String(rec.belongTo ?? "").trim() || belongToForKind(kind),
      opensAt: asIsoDate(rec.opensAt),
      closesAt: asIsoDate(rec.closesAt),
    });
  }
  return out;
}

export function formIsOpen(form: AdmissionFormWindow, now = new Date()) {
  if (form.status !== "open") return false;
  if (form.opensAt && new Date(form.opensAt) > now) return false;
  if (form.closesAt) {
    const closes = new Date(form.closesAt);
    if (!Number.isNaN(closes.getTime()) && closes < now) return false;
  }
  return true;
}

export function openForms(
  forms: AdmissionFormWindow[],
  kind?: FormKind,
  now = new Date(),
) {
  return forms.filter(
    (form) => (!kind || form.kind === kind) && formIsOpen(form, now),
  );
}

export function fieldControl(type: string | null | undefined) {
  const t = (type ?? "").trim().toLowerCase();
  if (t === "number") return "number";
  if (t === "date") return "date";
  if (t === "textarea" || t === "text") return "textarea";
  if (t === "select" || t === "dropdown") return "select";
  return "input";
}

export function selectOptions(values?: string | null) {
  return (values ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function extraAnswersPayload(
  fields: Array<{ id: string; name: string; required: boolean }>,
  answers: Record<string, unknown>,
) {
  const missing = fields.filter((field) => {
    if (!field.required) return false;
    const raw = answers[field.id] ?? answers[field.name];
    return String(raw ?? "").trim() === "";
  });
  if (missing.length) {
    throw validationError({
      answers: missing.map((field) => field.name).join(", "),
    });
  }
  const packed: Record<string, string> = {};
  for (const field of fields) {
    const raw = answers[field.id] ?? answers[field.name];
    if (raw == null) continue;
    const text = String(raw).trim();
    if (text) packed[field.id] = text;
  }
  return packed;
}

export function notesWithAnswers(
  existing: string | null | undefined,
  formId: string | null,
  answers: Record<string, string>,
) {
  const prior = parseApplicationNotes(existing);
  return JSON.stringify({
    ...prior,
    formId: formId ?? prior.formId ?? null,
    answers: { ...prior.answers, ...answers },
  });
}

export function parseApplicationNotes(notes: string | null | undefined): {
  formId: string | null;
  answers: Record<string, string>;
  text?: string;
} {
  if (!notes?.trim()) return { formId: null, answers: {} };
  try {
    const parsed = JSON.parse(notes) as {
      formId?: string | null;
      answers?: Record<string, unknown>;
      text?: string;
    };
    if (!parsed || typeof parsed !== "object") {
      return { formId: null, answers: {}, text: notes };
    }
    const answers: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.answers ?? {})) {
      if (value != null && String(value).trim()) answers[key] = String(value);
    }
    return {
      formId: parsed.formId ?? null,
      answers,
      text: parsed.text,
    };
  } catch {
    return { formId: null, answers: {}, text: notes };
  }
}

export function packEnquiryRemarks(
  text: string | undefined,
  answers?: Record<string, string>,
) {
  if (!answers || !Object.keys(answers).length) return text;
  return JSON.stringify({ text: text ?? "", answers });
}

export function upsertForm(
  forms: AdmissionFormWindow[],
  input: {
    id?: string;
    name: string;
    kind?: string;
    status?: string;
    belongTo?: string;
    opensAt?: string | null;
    closesAt?: string | null;
  },
): AdmissionFormWindow[] {
  const name = input.name.trim();
  if (!name) throw validationError({ name: "required" });
  const kind = parseKind(input.kind);
  const next: AdmissionFormWindow = {
    id: input.id?.trim() || crypto.randomUUID(),
    name,
    kind,
    status: parseStatus(input.status),
    belongTo: input.belongTo?.trim() || belongToForKind(kind),
    opensAt: asIsoDate(input.opensAt),
    closesAt: asIsoDate(input.closesAt),
  };
  const idx = forms.findIndex((form) => form.id === next.id);
  if (idx < 0) return [...forms, next];
  const copy = forms.slice();
  copy[idx] = next;
  return copy;
}

export function dropForm(forms: AdmissionFormWindow[], id: string) {
  const key = String(id ?? "").trim();
  if (!key) throw validationError({ id: "required" });
  const next = forms.filter((form) => form.id !== key);
  if (next.length === forms.length) throw notFound("form");
  return next;
}

export async function listAdmissionForms(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: FORMS_SETTING_KEY } },
  });
  return parseAdmissionForms(row?.value);
}

export async function saveAdmissionForms(
  campusId: string,
  forms: AdmissionFormWindow[],
) {
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: FORMS_SETTING_KEY } },
    update: { value: forms },
    create: { campusId, key: FORMS_SETTING_KEY, value: forms },
  });
  return forms;
}

export async function writeAdmissionForm(
  campusId: string,
  input: {
    id?: string;
    name: string;
    kind?: string;
    status?: string;
    belongTo?: string;
    opensAt?: string | null;
    closesAt?: string | null;
  },
) {
  const forms = upsertForm(await listAdmissionForms(campusId), input);
  await saveAdmissionForms(campusId, forms);
  if (input.id?.trim()) {
    const found = forms.find((form) => form.id === input.id?.trim());
    if (found) return found;
  }
  return forms.at(-1)!;
}

export async function getAdmissionForm(campusId: string, id: string) {
  const row = (await listAdmissionForms(campusId)).find(
    (form) => form.id === String(id ?? "").trim(),
  );
  if (!row) throw notFound("form");
  return row;
}

export async function removeAdmissionForm(campusId: string, id: string) {
  const next = dropForm(await listAdmissionForms(campusId), id);
  await saveAdmissionForms(campusId, next);
  return { id: String(id ?? "").trim(), deleted: true };
}

export async function hideAdmissionForm(campusId: string, id: string) {
  const forms = await listAdmissionForms(campusId);
  const current = forms.find((form) => form.id === id);
  if (!current) throw notFound("form");
  const next = forms.map((form) =>
    form.id === id ? { ...form, status: "hidden" as const } : form,
  );
  await saveAdmissionForms(campusId, next);
  return next.find((form) => form.id === id)!;
}

export async function fieldsForBelongTo(campusId: string, belongTo: string) {
  return prisma.customField.findMany({
    where: { campusId, belongTo, visible: true },
    orderBy: { name: "asc" },
  });
}

export async function fieldsForForms(
  campusId: string,
  forms: AdmissionFormWindow[],
) {
  const belong = [...new Set(forms.map((form) => form.belongTo))];
  if (!belong.length) return [] as Awaited<ReturnType<typeof fieldsForBelongTo>>;
  return prisma.customField.findMany({
    where: { campusId, belongTo: { in: belong }, visible: true },
    orderBy: { name: "asc" },
  });
}

export function attachFields(
  forms: AdmissionFormWindow[],
  fields: Array<{
    id: string;
    name: string;
    belongTo: string;
    type: string;
    values: string | null;
    required: boolean;
    columnSpan: number;
  }>,
) {
  return forms.map((form) => ({
    ...form,
    fields: fields
      .filter((field) => field.belongTo === form.belongTo)
      .map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        values: field.values,
        required: field.required,
        columnSpan: field.columnSpan,
        control: fieldControl(field.type),
        options: selectOptions(field.values),
      })),
  }));
}

export async function openFormCatalog(campusId: string, kind: FormKind) {
  const forms = await listAdmissionForms(campusId);
  const open = openForms(forms, kind);
  const form = open[0] ?? null;
  const fields = form ? await fieldsForBelongTo(campusId, form.belongTo) : [];
  return {
    form: form
      ? { id: form.id, name: form.name, kind: form.kind, belongTo: form.belongTo }
      : null,
    fields: fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      values: field.values,
      required: field.required,
      columnSpan: field.columnSpan,
      control: fieldControl(field.type),
      options: selectOptions(field.values),
    })),
  };
}
