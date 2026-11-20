import { fail, ok } from "@/lib/http";
import { platformOverview, requirePlatformDesk } from "@/lib/platform-desk";

export async function GET(request: Request) {
  try {
    await requirePlatformDesk(request, "view");
    return ok(await platformOverview());
  } catch (error) {
    return fail(error);
  }
}
