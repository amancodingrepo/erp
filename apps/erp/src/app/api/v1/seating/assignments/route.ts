import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listSeatAssignments } from "@/lib/services/seating";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    const examSubjectId =
      new URL(request.url).searchParams.get("examSubjectId") ?? undefined;
    const rows = await listSeatAssignments(user.campusId, examSubjectId);
    return ok({
      data: rows.map((r) => ({
        id: r.id,
        seatNo: r.seatNo,
        block: r.block.name,
        exam: r.examSubject.exam.name,
        student: {
          admissionNo: r.student.admissionNo,
          name: [r.student.firstName, r.student.lastName].filter(Boolean).join(" "),
        },
      })),
    });
  } catch (error) {
    return fail(error);
  }
}
