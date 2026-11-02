import { LiveClassProvider } from "@prisma/client";
import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createLiveClass, listLiveClasses } from "@/lib/services/live-class";

const bodySchema = z.object({
  provider: z.nativeEnum(LiveClassProvider),
  title: z.string().min(1),
  meetingUrl: z.string().min(1),
  recordingUrl: z.string().optional(),
  startsAt: z.string().min(1),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  staffId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    const providerParam = new URL(request.url).searchParams.get("provider");
    const provider =
      providerParam === "GMEET" || providerParam === "ZOOM"
        ? (providerParam as LiveClassProvider)
        : undefined;
    const rows = await listLiveClasses(user.campusId, provider);
    return ok({
      data: rows.map((r) => ({
        id: r.id,
        provider: r.provider,
        title: r.title,
        meetingUrl: r.meetingUrl,
        recordingUrl: r.recordingUrl,
        startsAt: r.startsAt,
        class: r.class?.name ?? null,
        subject: r.subject?.name ?? null,
        staff: r.staff
          ? [r.staff.firstName, r.staff.lastName].filter(Boolean).join(" ")
          : null,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await createLiveClass(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
