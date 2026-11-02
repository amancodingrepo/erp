import { created, fail, ok, readJson } from "@/lib/http";
import { listRoutes, requireStaff, saveRoute } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    return ok({ routes: await listRoutes(user.campusId, false) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<Record<string, unknown>>(request);
    const route = await saveRoute(user.campusId, body);
    return created({ route: route.name });
  } catch (error) {
    return fail(error);
  }
}
