import { created, fail } from "@/lib/http";
import { publicCampus } from "@/lib/services/applications";
import { createApplicationOrder } from "@/lib/services/gateway";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const campus = await publicCampus();
    const { id } = await context.params;
    const order = await createApplicationOrder({
      campusId: campus.id,
      applicationId: id,
    });
    return created(order);
  } catch (error) {
    return fail(error);
  }
}
