import { notFound } from "@/lib/errors";
import { fail } from "@/lib/http";
import { requireCampusUser } from "@/lib/school-world-bridge";
import { schoolLogo } from "@/lib/school-branding";

/** The signed-in user's school logo. Each school only ever gets its own. */
export async function GET(request: Request) {
  try {
    const user = await requireCampusUser(request);
    const logo = await schoolLogo(user.campusId);
    if (!logo) throw notFound("school logo");
    return new Response(new Uint8Array(logo.bytes), {
      headers: {
        "Content-Type": logo.mime,
        "Content-Length": String(logo.bytes.length),
        // The URL carries a version, so a long private cache is safe; a new upload changes the URL.
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
