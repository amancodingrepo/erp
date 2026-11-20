import { fail, ok } from "@/lib/http";
import { requirePlatformDesk, searchStudents } from "@/lib/platform-desk";

export async function GET(request: Request) {
  try {
    await requirePlatformDesk(request, "view");
    const q = new URL(request.url).searchParams.get("q") ?? "";
    return ok({ data: await searchStudents(q) });
  } catch (error) { return fail(error); }
}
