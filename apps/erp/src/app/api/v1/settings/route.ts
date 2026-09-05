import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  sessionId: z.string().optional().nullable(),
  dateFormat: z.string().optional(),
  timezone: z.string().optional(),
  startWeek: z.number().int().min(0).max(6).optional(),
  currencyFormat: z.string().optional().nullable(),
  currencyPlace: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "view",
    );
    const campus = await prisma.campus.findUnique({
      where: { id: user.campusId },
    });
    if (!campus) throw notFound("campus");
    return ok({
      name: campus.name,
      code: campus.code,
      address: campus.address,
      phone: campus.phone,
      email: campus.email,
      sessionId: campus.currentSessionId,
      dateFormat: campus.dateFormat,
      timezone: campus.timezone,
      startWeek: campus.startWeek,
      currencyFormat: campus.currencyFormat,
      currencyPlace: campus.currencyPlace,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "edit",
    );
    const body = patchSchema.parse(await readJson(request));
    const campus = await prisma.campus.update({
      where: { id: user.campusId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.code !== undefined ? { code: body.code } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.email !== undefined
          ? { email: body.email === "" ? null : body.email }
          : {}),
        ...(body.sessionId !== undefined
          ? { currentSessionId: body.sessionId }
          : {}),
        ...(body.dateFormat !== undefined ? { dateFormat: body.dateFormat } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.startWeek !== undefined ? { startWeek: body.startWeek } : {}),
        ...(body.currencyFormat !== undefined
          ? { currencyFormat: body.currencyFormat }
          : {}),
        ...(body.currencyPlace !== undefined
          ? { currencyPlace: body.currencyPlace }
          : {}),
      },
    });
    return ok({
      name: campus.name,
      code: campus.code,
      address: campus.address,
      phone: campus.phone,
      email: campus.email,
      sessionId: campus.currentSessionId,
      dateFormat: campus.dateFormat,
      timezone: campus.timezone,
      startWeek: campus.startWeek,
      currencyFormat: campus.currencyFormat,
      currencyPlace: campus.currencyPlace,
    });
  } catch (error) {
    return fail(error);
  }
}
