import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { uploadsRoot } from "@/lib/uploads";

export function studentDocumentRelPath(
  fileUrl: string,
  campusId: string,
  studentId: string,
) {
  const rel = String(fileUrl ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const prefix = `uploads/${campusId}/students/${studentId}/`;
  if (!rel.startsWith(prefix)) return null;
  const rest = rel.slice(prefix.length);
  if (!rest || rest.includes("..") || rest.split("/").some((part) => !part)) {
    return null;
  }
  return rest;
}

export async function deleteStudentDocument(
  campusId: string,
  studentId: string,
  docId: string,
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, campusId },
    select: { id: true },
  });
  if (!student) throw notFound("student");
  const doc = await prisma.studentDocument.findFirst({
    where: { id: docId, studentId: student.id },
  });
  if (!doc) throw notFound("document");
  await prisma.studentDocument.delete({ where: { id: doc.id } });
  const rel = studentDocumentRelPath(doc.fileUrl, campusId, student.id);
  if (rel) {
    try {
      await unlink(path.join(uploadsRoot(), campusId, "students", student.id, ...rel.split("/")));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }
  return { ok: true, id: doc.id };
}
