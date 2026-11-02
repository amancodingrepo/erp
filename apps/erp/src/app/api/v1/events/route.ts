import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseEventQuery } from "@/lib/services/campus-spec-aliases";
import { createEvent, listEvents } from "@/lib/services/diary";

const bodySchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  classId: z.string().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const query = parseEventQuery(new URL(request.url).searchParams);
    return ok({ data: await listEvents(user.campusId, query) });
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
      "create",
    );
    const body = bodySchema.parse(await readJson(request));
    return created(await createEvent(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
