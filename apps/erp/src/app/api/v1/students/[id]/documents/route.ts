import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { created, fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { saveStudentDocumentFile } from "@/lib/uploads";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "view",
    );
    const { id } = await context.params;
    const student = await prisma.student.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!student) throw notFound("student");
    const data = await prisma.studentDocument.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
    });
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const { id } = await context.params;
    const student = await prisma.student.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!student) throw notFound("student");
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    if (!title) throw validationError({ title: "required" });
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw validationError({ file: "file required" });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const saved = await saveStudentDocumentFile({
      campusId: user.campusId,
      studentId: id,
      filename: file.name,
      mime: file.type,
      bytes,
    });
    const row = await prisma.studentDocument.create({
      data: {
        studentId: id,
        title,
        type: file.type || null,
        fileUrl: saved.fileUrl,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}
