import { z } from "zod";
import {
  classInCampus,
  currentSessionId,
  sectionInCampus,
  sessionInCampus,
} from "@/lib/campus";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const upsertSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().optional().nullable(),
  subjectId: z.string().min(1),
  staffId: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "subject",
      "view",
    );
    const params = new URL(request.url).searchParams;
    const classId = params.get("classId") ?? undefined;
    const sectionId = params.get("sectionId") ?? undefined;
    const sessionId =
      params.get("sessionId") ?? (await currentSessionId(user));
    const data = await prisma.classSubject.findMany({
      where: {
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(sessionId ? { sessionId } : {}),
        subject: { campusId: user.campusId },
      },
      include: { subject: true },
      orderBy: { id: "asc" },
    });
    return ok({ data, sessionId });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "subject",
      "create",
    );
    const body = upsertSchema.parse(await readJson(request));
    await classInCampus(user.campusId, body.classId);
    if (body.sectionId) await sectionInCampus(user.campusId, body.sectionId);
    const subject = await prisma.subject.findFirst({
      where: { id: body.subjectId, campusId: user.campusId },
    });
    if (!subject) throw notFound("subject");
    if (body.staffId) {
      const staff = await prisma.staff.findFirst({
        where: { id: body.staffId, campusId: user.campusId },
      });
      if (!staff) throw notFound("staff");
    }
    const sessionId = body.sessionId ?? (await currentSessionId(user));
    if (sessionId) await sessionInCampus(user.campusId, sessionId);
    const existing = await prisma.classSubject.findFirst({
      where: {
        classId: body.classId,
        subjectId: body.subjectId,
        sectionId: body.sectionId ?? null,
        sessionId: sessionId ?? null,
      },
    });
    if (existing) {
      const row = await prisma.classSubject.update({
        where: { id: existing.id },
        data: { staffId: body.staffId ?? null },
      });
      return created(row);
    }
    const row = await prisma.classSubject.create({
      data: {
        classId: body.classId,
        sectionId: body.sectionId ?? null,
        subjectId: body.subjectId,
        staffId: body.staffId ?? null,
        sessionId: sessionId ?? null,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}
