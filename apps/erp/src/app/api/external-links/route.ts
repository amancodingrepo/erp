import { created, fail, ok, readJson } from "@/lib/http";
import { listExternalLinks, requireStaff, saveExternalLink } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ links: await listExternalLinks(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<Record<string, unknown>>(request);
    const link = await saveExternalLink(user.campusId, body);
    return created({ ok: true, id: link.id });
  } catch (error) {
    return fail(error);
  }
}
