import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { applyLeave } from "@/lib/services/attendance";

const createSchema = z.object({
  leaveTypeId: z.string().min(1),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  reason: z.string().optional(),
  studentId: z.string().optional(),
  staffId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "leave",
      "approve",
    );
    const status = new URL(request.url).searchParams.get("status");
    const data = await prisma.leaveRequest.findMany({
      where: {
        leaveType: { campusId: user.campusId },
        ...(status ? { status } : {}),
      },
      include: { leaveType: true },
      orderBy: { fromDate: "desc" },
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
      "attendance",
      "student",
      "edit",
    );
    const body = createSchema.parse(await readJson(request));
    const row = await applyLeave({ campusId: user.campusId, body });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}
