import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { assertCampusStaff } from "@/lib/school-world-shape";

export async function GET(
  request: Request,
  context: { params: Promise<{ moduleKey: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const { moduleKey } = await context.params;
    const row = await prisma.screenRecord.findFirst({
      where: { campusId: user.campusId, screenKey: moduleKey, title: "state" },
      orderBy: { updatedAt: "desc" },
    });
    return ok({ data: row?.payload ?? null, updatedAt: row?.updatedAt ?? null });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ moduleKey: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const { moduleKey } = await context.params;
    const body = await readJson<{ data?: unknown }>(request);
    const payload = body.data ?? {};
    if (JSON.stringify(payload).length > 2 * 1024 * 1024) {
      throw new HttpError(413, "payload_too_large", "Module data exceeds 2 MB.");
    }
    const existing = await prisma.screenRecord.findFirst({
      where: { campusId: user.campusId, screenKey: moduleKey, title: "state" },
      orderBy: { updatedAt: "desc" },
    });
    const row = existing
      ? await prisma.screenRecord.update({
          where: { id: existing.id },
          data: { payload: payload as object },
        })
      : await prisma.screenRecord.create({
          data: {
            campusId: user.campusId,
            screenKey: moduleKey,
            title: "state",
            payload: payload as object,
          },
        });
    return ok({ ok: true, updatedAt: row.updatedAt });
  } catch (error) {
    return fail(error);
  }
}
