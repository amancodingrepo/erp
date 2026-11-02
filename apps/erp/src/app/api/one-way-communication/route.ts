import { fail, ok, readJson } from "@/lib/http";
import { listCommunicationCategories, requireStaff, saveCommunicationBlocks } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ categories: await listCommunicationCategories(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<{ blockedCategoryIds?: unknown }>(request);
    return ok(await saveCommunicationBlocks(user.campusId, body.blockedCategoryIds));
  } catch (error) {
    return fail(error);
  }
}
