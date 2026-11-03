import { created, fail, ok, readJson } from "@/lib/http";
import { listMessages, postMessage, requireCampusUser, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    // Everyone reads their own inbox and sent messages; only staff may post to the school.
    const user = await requireCampusUser(request);
    const folder = new URL(request.url).searchParams.get("folder") || "inbox";
    return ok({ folder, messages: await listMessages(user.campusId, user.id, folder) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<Record<string, unknown>>(request);
    return created(await postMessage(user.campusId, user.id, body));
  } catch (error) {
    return fail(error);
  }
}
