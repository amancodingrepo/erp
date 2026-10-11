import { z } from "zod";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  hideAdmissionForm,
  listAdmissionForms,
  writeAdmissionForm,
} from "@/lib/services/admission-forms";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  kind: z.enum(["admission", "enquiry"]).optional(),
  status: z.enum(["open", "hidden"]).optional(),
  belongTo: z.string().optional(),
  opensAt: z.string().nullable().optional(),
  closesAt: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "edit",
    );
    const { id } = await context.params;
    const body = patchSchema.parse(await readJson(request));
    if (body.status === "hidden" && !body.name) {
      return ok(await hideAdmissionForm(user.campusId, id));
    }
    const current = (await listAdmissionForms(user.campusId)).find(
      (form) => form.id === id,
    );
    if (!current) throw notFound("form");
    return ok(
      await writeAdmissionForm(user.campusId, {
        ...current,
        ...body,
        id,
        name: body.name ?? current.name,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
