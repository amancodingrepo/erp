import { created, fail, ok, readJson } from "@/lib/http";
import { listStaffCategories, requireStaff, saveStaffCategory } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ categories: await listStaffCategories(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<Record<string, unknown>>(request);
    return created({ category: await saveStaffCategory(user.campusId, body) });
  } catch (error) {
    return fail(error);
  }
}
