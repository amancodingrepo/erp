import { fail, ok } from "@/lib/http";
import { platformAccounts, requirePlatformDesk } from "@/lib/platform-desk";

export async function GET(request: Request) {
  try {
    await requirePlatformDesk(request, "view");
    const params = new URL(request.url).searchParams;
    return ok({
      data: await platformAccounts({
        orgId: params.get("orgId") || undefined,
        q: params.get("q") || undefined,
      }),
    });
  } catch (error) {
    return fail(error);
  }
}
