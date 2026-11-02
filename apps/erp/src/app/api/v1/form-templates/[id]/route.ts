import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseFormTemplatePatch } from "@/lib/services/campus-spec-aliases";
import {
  attachFields,
  fieldsForForms,
  getAdmissionForm,
  hideAdmissionForm,
  listAdmissionForms,
  removeAdmissionForm,
  writeAdmissionForm,
} from "@/lib/services/admission-forms";

async function loadForm(campusId: string, id: string) {
  const form = await getAdmissionForm(campusId, id);
  const fields = await fieldsForForms(campusId, [form]);
  return attachFields([form], fields)[0];
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "view");
    const { id } = await context.params;
    return ok(await loadForm(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "edit");
    const { id } = await context.params;
    const body = parseFormTemplatePatch(await readJson(request));
    if (body.status === "hidden" && !body.name && body.kind === undefined) {
      return ok(await hideAdmissionForm(user.campusId, id));
    }
    const current = (await listAdmissionForms(user.campusId)).find(
      (form) => form.id === id,
    );
    if (!current) throw notFound("form");
    await writeAdmissionForm(user.campusId, {
      ...current,
      ...body,
      id,
      name: body.name ?? current.name,
    });
    return ok(await loadForm(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "edit");
    const { id } = await context.params;
    return ok({ data: await removeAdmissionForm(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
