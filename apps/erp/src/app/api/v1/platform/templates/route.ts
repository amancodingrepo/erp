import { fail, ok } from "@/lib/http";
import { platformTemplates, requirePlatformDesk } from "@/lib/platform-desk";

export async function GET(request: Request) {
  try {
    await requirePlatformDesk(request, "view");
    const orgId = new URL(request.url).searchParams.get("orgId") || undefined;
    return ok({ data: await platformTemplates(orgId) });
  } catch (error) {
    return fail(error);
  }
}
