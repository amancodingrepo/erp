import { AttendanceStatus } from "@prisma/client";
import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { markStudents, roster } from "@/lib/services/attendance";

const putSchema = z.object({
  date: z.string(),
  sectionId: z.string(),
  subjectId: z.string().optional(),
  override: z.boolean().optional(),
  entries: z.array(
    z.object({
      studentId: z.string(),
      status: z.nativeEnum(AttendanceStatus),
    }),
  ),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "student",
      "view",
    );
    const params = new URL(request.url).searchParams;
    return ok(
      await roster({
        campusId: user.campusId,
        sectionId: params.get("sectionId") ?? undefined,
        date: params.get("date") ?? new Date().toISOString().slice(0, 10),
        subjectId: params.get("subjectId") ?? undefined,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "student",
      "edit",
    );
    const body = putSchema.parse(await readJson(request));
    return ok(
      await markStudents({
        user,
        date: body.date,
        sectionId: body.sectionId,
        subjectId: body.subjectId,
        override: body.override,
        entries: body.entries,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
