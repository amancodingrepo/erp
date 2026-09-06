import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  createStudent,
  listStudents,
  studentCreateSchema,
} from "@/lib/services/students";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "view",
    );
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize") ?? 20)));
    return ok(
      await listStudents({
        campusId: user.campusId,
        q: params.get("q") ?? undefined,
        classId: params.get("classId") ?? undefined,
        sectionId: params.get("sectionId") ?? undefined,
        status: params.get("status"),
        page,
        pageSize,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "create",
    );
    const body = studentCreateSchema.parse(await readJson(request));
    const student = await createStudent({ campusId: user.campusId, body });
    return created({
      id: student.id,
      admissionNo: student.admissionNo,
      firstName: student.firstName,
      lastName: student.lastName,
      status: student.status,
    });
  } catch (error) {
    return fail(error);
  }
}
