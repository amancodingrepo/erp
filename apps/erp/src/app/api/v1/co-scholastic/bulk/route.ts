import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { notFound } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { prisma } from "@/lib/db";
import { bulkSaveCoScholastic } from "@/lib/services/campus-coscholastic";
import { requirePerformanceTemplate } from "@/lib/services/engagement";

const bodySchema = z.object({
  classId: z.string().min(1),
  aspectId: z.string().min(1),
  grade: z.string().min(1),
  remark: z.string().optional(),
  studentIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "marks", "edit");
    const body = bodySchema.parse(await readJson(request));
    const klass = await prisma.class.findFirst({
      where: {
        id: body.classId,
        program: { department: { campusId: user.campusId } },
      },
      include: { sections: { select: { id: true } } },
    });
    if (!klass) throw notFound("class");
    await requirePerformanceTemplate(
      user.campusId,
      klass.sections.map((row) => row.id),
    );
    return created(await bulkSaveCoScholastic(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
