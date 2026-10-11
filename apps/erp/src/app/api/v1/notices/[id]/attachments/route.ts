import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { saveNoticeAttachment } from "@/lib/services/diary";

const bodySchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "create",
    );
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return created(
      await saveNoticeAttachment(user.campusId, {
        noticeId: id,
        name: body.name,
        url: body.url,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
