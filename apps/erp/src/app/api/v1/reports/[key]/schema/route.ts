import { fail, ok } from "@/lib/http";
import { reportSchema } from "@/lib/reports";
import { requireReport } from "@/lib/reports/access";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    await requireReport(request, key);
    return ok({ data: reportSchema(key) });
  } catch (error) {
    return fail(error);
  }
}
