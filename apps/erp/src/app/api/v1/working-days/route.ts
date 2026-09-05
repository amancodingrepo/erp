import { z } from "zod";
import { currentSessionId, parseDateOnly, sessionInCampus } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const putSchema = z.object({
  date: z.string().min(1),
  isWorking: z.boolean(),
  note: z.string().optional().nullable(),
  sessionId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "view",
    );
    const params = new URL(request.url).searchParams;
    const sessionId =
      params.get("sessionId") ?? (await currentSessionId(user));
    const from = params.get("from");
    const to = params.get("to");
    const data = await prisma.workingDay.findMany({
      where: {
        campusId: user.campusId,
        ...(sessionId ? { sessionId } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: parseDateOnly(from) } : {}),
                ...(to ? { lte: parseDateOnly(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: "asc" },
    });
    return ok({ data, sessionId });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "edit",
    );
    const body = putSchema.parse(await readJson(request));
    const sessionId = body.sessionId ?? (await currentSessionId(user));
    if (!sessionId) throw validationError({ sessionId: "required" });
    await sessionInCampus(user.campusId, sessionId);
    const date = parseDateOnly(body.date);
    const row = await prisma.workingDay.upsert({
      where: {
        campusId_date: { campusId: user.campusId, date },
      },
      update: {
        isWorking: body.isWorking,
        note: body.note ?? null,
        sessionId,
      },
      create: {
        campusId: user.campusId,
        sessionId,
        date,
        isWorking: body.isWorking,
        note: body.note ?? null,
      },
    });
    return ok(row);
  } catch (error) {
    return fail(error);
  }
}
