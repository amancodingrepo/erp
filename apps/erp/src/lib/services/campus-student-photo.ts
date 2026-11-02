import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { saveCampusFile } from "@/lib/services/campus-files";

export function imageUploadExt(filename: string, mime: string) {
  const name = String(filename ?? "").toLowerCase();
  const type = String(mime ?? "").toLowerCase();
  if (type.includes("png") || name.endsWith(".png")) return "png";
  if (
    type.includes("jpeg") ||
    type.includes("jpg") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return "jpg";
  }
  throw validationError({ file: "image required" });
}

export async function saveStudentPhoto(input: {
  campusId: string;
  studentId: string;
  filename: string;
  mime: string;
  bytes: Uint8Array;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId: input.campusId },
    select: { id: true },
  });
  if (!student) throw notFound("student");
  imageUploadExt(input.filename, input.mime);
  const saved = await saveCampusFile({
    campusId: input.campusId,
    kind: "student",
    ownerId: student.id,
    name: input.filename,
    filename: input.filename,
    mime: input.mime,
    bytes: input.bytes,
  });
  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { photoUrl: saved.url },
    select: { id: true, photoUrl: true },
  });
  return updated;
}
