import { AttendanceStatus } from "@prisma/client";
import { z } from "zod";
import { parseDateOnly } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { markStaff } from "@/lib/services/attendance";

const putSchema = z.object({
  date: z.string(),
  override: z.boolean().optional(),
  entries: z.array(
    z.object({
      staffId: z.string(),
      status: z.nativeEnum(AttendanceStatus),
      inTime: z.string().optional(),
      outTime: z.string().optional(),
    }),
  ),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const dateParam =
      new URL(request.url).searchParams.get("date") ??
      new Date().toISOString().slice(0, 10);
    const date = parseDateOnly(dateParam);
    const staff = await prisma.staff.findMany({
      where: { campusId: user.campusId, isActive: true },
      orderBy: { firstName: "asc" },
    });
    const marks = await prisma.staffAttendance.findMany({
      where: { date, staffId: { in: staff.map((s) => s.id) } },
    });
    const byStaff = new Map(marks.map((m) => [m.staffId, m]));
    return ok({
      date: dateParam,
      data: staff.map((s) => ({
        staffId: s.id,
        employeeId: s.employeeId,
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        status: byStaff.get(s.id)?.status ?? null,
        inTime: byStaff.get(s.id)?.inTime ?? null,
        outTime: byStaff.get(s.id)?.outTime ?? null,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "edit");
    const body = putSchema.parse(await readJson(request));
    return ok(
      await markStaff({
        user,
        date: body.date,
        override: body.override,
        entries: body.entries,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
