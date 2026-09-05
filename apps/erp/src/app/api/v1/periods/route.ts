import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  name: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "view",
    );
    const data = await prisma.period.findMany({
      where: { campusId: user.campusId },
      orderBy: { sortOrder: "asc" },
    });
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "create",
    );
    const body = createSchema.parse(await readJson(request));
    const max = await prisma.period.aggregate({
      where: { campusId: user.campusId },
      _max: { sortOrder: true },
    });
    const row = await prisma.period.create({
      data: {
        campusId: user.campusId,
        name: body.name,
        startTime: body.startTime,
        endTime: body.endTime,
        sortOrder: body.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "create",
    );
    const body = patchSchema.parse(await readJson(request));
    const existing = await prisma.period.findFirst({
      where: { id: body.id, campusId: user.campusId },
    });
    if (!existing) throw notFound("period");
    const row = await prisma.period.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        startTime: body.startTime,
        endTime: body.endTime,
        sortOrder: body.sortOrder,
      },
    });
    return ok(row);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "create",
    );
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw notFound("period");
    const existing = await prisma.period.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("period");
    await prisma.period.delete({ where: { id: existing.id } });
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
