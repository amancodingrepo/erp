import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { validationError } from "./errors";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "pdf"]);
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
]);

export function uploadsRoot() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

function sniffExt(bytes: Uint8Array, filename: string, mime: string) {
  const name = filename.split(/[/\\]/).pop() ?? "";
  if (name.split(".").length > 2) {
    throw validationError({ file: "double extension not allowed" });
  }
  const fromName = name.includes(".")
    ? name.slice(name.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (fromName && !ALLOWED_EXT.has(fromName)) {
    throw validationError({ file: "file type not allowed" });
  }
  const mimeOk = !mime || ALLOWED_MIME.has(mime.toLowerCase());
  if (!mimeOk) throw validationError({ file: "file type not allowed" });

  const isPdf =
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46;
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8;

  if (isPdf) return "pdf";
  if (isPng) return "png";
  if (isJpeg) return "jpg";
  if (fromName && ALLOWED_EXT.has(fromName) && mimeOk) return fromName === "jpeg" ? "jpg" : fromName;
  throw validationError({ file: "file type not allowed" });
}

export async function saveStudentDocumentFile(input: {
  campusId: string;
  studentId: string;
  filename: string;
  mime: string;
  bytes: Uint8Array;
}) {
  if (input.bytes.byteLength > MAX_BYTES) {
    throw validationError({ file: "file exceeds 5MB" });
  }
  const ext = sniffExt(input.bytes, input.filename, input.mime);
  const dir = path.join(
    uploadsRoot(),
    input.campusId,
    "students",
    input.studentId,
  );
  await mkdir(dir, { recursive: true });
  const stored = `${randomUUID()}.${ext}`;
  const abs = path.join(dir, stored);
  await writeFile(abs, input.bytes);
  const fileUrl = path
    .posix.join("uploads", input.campusId, "students", input.studentId, stored);
  return { fileUrl, abs };
}
