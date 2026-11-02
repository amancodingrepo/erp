import { created, fail, ok, readJson } from "@/lib/http";
import { listRoutes, requireStaff, saveRoute } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ routes: await listRoutes(user.campusId, true) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<Record<string, unknown>>(request);
    return created({ route: await saveRoute(user.campusId, body) });
  } catch (error) {
    return fail(error);
  }
}
