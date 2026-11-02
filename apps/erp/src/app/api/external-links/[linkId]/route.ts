import { fail, ok, readJson } from "@/lib/http";
import { deleteExternalLink, requireStaff, saveExternalLink } from "@/lib/school-world-bridge";

export async function PATCH(request: Request, context: { params: Promise<{ linkId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { linkId } = await context.params;
    const body = await readJson<Record<string, unknown>>(request);
    const link = await saveExternalLink(user.campusId, body, decodeURIComponent(linkId));
    return ok({ ok: true, id: link.id });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ linkId: string }> }) {
  try {
    const user = await requireStaff(request);
    const { linkId } = await context.params;
    await deleteExternalLink(user.campusId, decodeURIComponent(linkId));
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
