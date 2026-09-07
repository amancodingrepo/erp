import { z } from "zod";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { allocateExamSeating } from "@/lib/services/seating";

const bodySchema = z.object({
  examSubjectId: z.string().min(1),
  blockIds: z.array(z.string().min(1)).min(1),
  classId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "create");
    const body = bodySchema.parse(await readJson(request));
    const rows = await allocateExamSeating(user.campusId, body);
    return created({
      data: rows.map((r) => ({
        id: r.id,
        seatNo: r.seatNo,
        block: r.block.name,
        student: {
          id: r.student.id,
          admissionNo: r.student.admissionNo,
          name: [r.student.firstName, r.student.lastName].filter(Boolean).join(" "),
        },
      })),
    });
  } catch (error) {
    return fail(error);
  }
}
