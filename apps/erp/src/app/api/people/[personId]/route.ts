import { fail, ok, readJson } from "@/lib/http";
import { patchPerson, requireStaff } from "@/lib/school-world-bridge";

export async function PATCH(request: Request, context: { params: Promise<{ personId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { personId } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);
    const person = await patchPerson(user.campusId, decodeURIComponent(personId), body);
    return ok({ ok: true, id: person.id, person });
  } catch (error) {
    return fail(error);
  }
}
