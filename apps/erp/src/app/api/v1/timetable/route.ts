import { z } from "zod";
import {
  currentSessionId,
  sectionInCampus,
  sessionInCampus,
  staffInCampus,
  subjectInCampus,
} from "@/lib/campus";
import { prisma } from "@/lib/db";
import { conflict, validationError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const slotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  periodId: z.string().min(1),
  subjectId: z.string().optional().nullable(),
  staffId: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
});

const putSchema = z.object({
  sectionId: z.string().min(1),
  sessionId: z.string().optional(),
  slots: z.array(slotSchema),
});

type ClashSlot = {
  sectionId: string;
  weekday: number;
  periodId: string;
  staffId: string | null;
  room: string | null;
};

function findClash(slots: ClashSlot[]): string | null {
  const seenPeriod = new Set<string>();
  const staffAt = new Map<string, ClashSlot>();
  const roomAt = new Map<string, ClashSlot>();
  for (const slot of slots) {
    const cell = `${slot.sectionId}:${slot.weekday}:${slot.periodId}`;
    if (seenPeriod.has(cell)) {
      return "duplicate period in section";
    }
    seenPeriod.add(cell);
    const when = `${slot.weekday}:${slot.periodId}`;
    if (slot.staffId) {
      const key = `${when}:${slot.staffId}`;
      const prev = staffAt.get(key);
      if (prev && prev.sectionId !== slot.sectionId) {
        return "staff clash";
      }
      if (prev && (prev.room ?? "") !== (slot.room ?? "")) {
        return "staff clash";
      }
      if (prev) return "staff clash";
      staffAt.set(key, slot);
    }
    const room = slot.room?.trim();
    if (room) {
      const key = `${when}:${room}`;
      const prev = roomAt.get(key);
      if (prev && prev.sectionId !== slot.sectionId) {
        return "room clash";
      }
      if (prev) return "room clash";
      roomAt.set(key, slot);
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "view",
    );
    const params = new URL(request.url).searchParams;
    const sectionId = params.get("sectionId");
    if (!sectionId) throw validationError({ sectionId: "required" });
    await sectionInCampus(user.campusId, sectionId);
    const sessionId =
      params.get("sessionId") ?? (await currentSessionId(user));
    if (!sessionId) throw validationError({ sessionId: "required" });
    const data = await prisma.timetableSlot.findMany({
      where: { sectionId, sessionId },
      orderBy: [{ weekday: "asc" }, { periodId: "asc" }],
    });
    return ok({ data, sessionId, sectionId });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "create",
    );
    const body = putSchema.parse(await readJson(request));
    const section = await sectionInCampus(user.campusId, body.sectionId);
    const sessionId = body.sessionId ?? (await currentSessionId(user));
    if (!sessionId) throw validationError({ sessionId: "required" });
    await sessionInCampus(user.campusId, sessionId);

    const periodIds = [...new Set(body.slots.map((s) => s.periodId))];
    if (periodIds.length) {
      const periods = await prisma.period.findMany({
        where: { id: { in: periodIds }, campusId: user.campusId },
      });
      if (periods.length !== periodIds.length) {
        throw validationError({ periodId: "unknown period" });
      }
    }
    for (const staffId of new Set(
      body.slots.map((s) => s.staffId).filter((id): id is string => Boolean(id)),
    )) {
      await staffInCampus(user.campusId, staffId);
    }
    for (const subjectId of new Set(
      body.slots
        .map((s) => s.subjectId)
        .filter((id): id is string => Boolean(id)),
    )) {
      await subjectInCampus(user.campusId, subjectId);
    }

    await prisma.$transaction(
      async (tx) => {
        const others = await tx.timetableSlot.findMany({
          where: { sessionId, sectionId: { not: body.sectionId } },
        });
        const combined: ClashSlot[] = [
          ...others.map((s) => ({
            sectionId: s.sectionId,
            weekday: s.weekday,
            periodId: s.periodId,
            staffId: s.staffId,
            room: s.room,
          })),
          ...body.slots.map((s) => ({
            sectionId: body.sectionId,
            weekday: s.weekday,
            periodId: s.periodId,
            staffId: s.staffId ?? null,
            room: s.room ?? null,
          })),
        ];
        const clash = findClash(combined);
        if (clash) throw conflict(clash);

        await tx.timetableSlot.deleteMany({
          where: { sessionId, sectionId: body.sectionId },
        });
        if (body.slots.length) {
          await tx.timetableSlot.createMany({
            data: body.slots.map((slot) => ({
              sessionId,
              classId: section.classId,
              sectionId: body.sectionId,
              weekday: slot.weekday,
              periodId: slot.periodId,
              subjectId: slot.subjectId ?? null,
              staffId: slot.staffId ?? null,
              room: slot.room ?? null,
            })),
          });
        }
      },
      { isolationLevel: "Serializable" },
    );

    const data = await prisma.timetableSlot.findMany({
      where: { sessionId, sectionId: body.sectionId },
      orderBy: [{ weekday: "asc" }, { periodId: "asc" }],
    });
    return ok({ data, sessionId, sectionId: body.sectionId });
  } catch (error) {
    return fail(error);
  }
}
