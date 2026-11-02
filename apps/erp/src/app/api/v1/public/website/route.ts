import { fail, ok } from "@/lib/http";
import { validationError } from "@/lib/errors";
import { publicCampusWebsite } from "@/lib/services/campus-branch";

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("campus") ?? "";
    if (!code.trim()) throw validationError({ campus: "required" });
    return ok(await publicCampusWebsite(code));
  } catch (error) {
    return fail(error);
  }
}
