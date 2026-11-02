import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { addMember } from "@/lib/services/library";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  studentId: z.string().optional(),
  staffId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const data = await prisma.libraryMember.findMany({
      where: { campusId: user.campusId },
      include: { student: true, staff: true },
      orderBy: { memberNo: "asc" },
    });
    return ok({
      data: data.map((m) => ({
        id: m.id,
        memberNo: m.memberNo,
        name: m.student
          ? [m.student.firstName, m.student.lastName].filter(Boolean).join(" ")
          : [m.staff?.firstName, m.staff?.lastName].filter(Boolean).join(" "),
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await addMember(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
