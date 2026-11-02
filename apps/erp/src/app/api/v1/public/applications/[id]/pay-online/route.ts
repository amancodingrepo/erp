import { created, fail } from "@/lib/http";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { createApplicationOrder } from "@/lib/services/gateway";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const application = await prisma.application.findUnique({
      where: { id },
    });
    if (!application) throw notFound("application");
    const order = await createApplicationOrder({
      campusId: application.campusId,
      applicationId: id,
    });
    return created(order);
  } catch (error) {
    return fail(error);
  }
}
