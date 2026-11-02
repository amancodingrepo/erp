import { created, fail, ok, readJson } from "@/lib/http";
import { listMessages, postMessage, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
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
