import { created, fail, readJson } from "@/lib/http";
import { requireCampusUser } from "@/lib/school-world-bridge";
import { sendParentMessage } from "@/lib/school-world-messaging";

export async function POST(request: Request) {
  try {
    const user = await requireCampusUser(request);
    return created(await sendParentMessage(user, await readJson<Record<string, unknown>>(request)));
  } catch (error) {
    return fail(error);
  }
}
