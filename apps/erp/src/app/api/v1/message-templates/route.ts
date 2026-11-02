import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listTemplates, upsertTemplate } from "@/lib/services/messages";

const bodySchema = z.object({
  channel: z.enum(["EMAIL", "SMS"]),
  name: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "view",
    );
    const channel = new URL(request.url).searchParams.get("channel") ?? undefined;
    return ok({ data: await listTemplates(user.campusId, channel ?? undefined) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "edit",
    );
    const body = bodySchema.parse(await readJson(request));
    return created(await upsertTemplate(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
