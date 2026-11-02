import { fail, ok } from "@/lib/http";
import { listPublicCampuses } from "@/lib/services/tenants";

export async function GET() {
  try {
    const data = await listPublicCampuses();
    return ok({
      data: data.map((c) => ({
        name: c.name,
        code: c.code,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}
