import { notFound } from "@/lib/errors";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseOpenForm } from "@/lib/services/campus-spec-aliases";
import {
  listAdmissionForms,
  writeAdmissionForm,
} from "@/lib/services/admission-forms";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "edit");
    const body = parseOpenForm(await readJson(request));
    const current = (await listAdmissionForms(user.campusId)).find(
      (form) => form.id === body.id,
    );
    if (!current) throw notFound("form");
    return created(
      await writeAdmissionForm(user.campusId, {
        ...current,
        id: current.id,
        name: current.name,
        status: body.status,
        opensAt: body.opensAt ?? current.opensAt,
        closesAt: body.closesAt ?? current.closesAt,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
