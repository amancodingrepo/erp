import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachFields,
  fieldsForForms,
  listAdmissionForms,
  openForms,
  parseKind,
  writeAdmissionForm,
} from "@/lib/services/admission-forms";

const bodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  kind: z.enum(["admission", "enquiry"]).optional(),
  status: z.enum(["open", "hidden"]).optional(),
  belongTo: z.string().optional(),
  opensAt: z.string().nullable().optional(),
  closesAt: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "view",
    );
    const params = new URL(request.url).searchParams;
    const kindRaw = params.get("kind");
    const kind =
      kindRaw === "admission" || kindRaw === "enquiry"
        ? parseKind(kindRaw)
        : undefined;
    const onlyOpen = params.get("open") === "1";
    let forms = await listAdmissionForms(user.campusId);
    if (kind) forms = forms.filter((form) => form.kind === kind);
    if (onlyOpen) forms = openForms(forms, kind);
    const fields = await fieldsForForms(user.campusId, forms);
    return ok({ data: attachFields(forms, fields) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "edit",
    );
    const body = bodySchema.parse(await readJson(request));
    const row = await writeAdmissionForm(user.campusId, body);
    return created(row);
  } catch (error) {
    return fail(error);
  }
}
