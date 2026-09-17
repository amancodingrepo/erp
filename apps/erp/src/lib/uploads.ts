import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "./db";
import { validationError } from "./errors";

const MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_EXT = ["pdf", "jpg", "jpeg", "png"];
const MIME_FOR: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg", "image/jpg"],
  jpeg: ["image/jpeg", "image/jpg"],
  png: ["image/png"],
};

export async function allowedUploadExts(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: "campus.uploadTypes" } },
  });
  const raw =
    typeof row?.value === "string"
      ? row.value
      : Array.isArray(row?.value)
        ? (row.value as string[]).join(",")
        : DEFAULT_EXT.join(",");
  const exts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(exts.length ? exts : DEFAULT_EXT);
}

export function uploadsRoot() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  if (process.env.NODE_ENV === "production") return "/app/uploads";
  return path.join(process.cwd(), "uploads");
}

function sniffExt(
  bytes: Uint8Array,
  filename: string,
  mime: string,
  allowed: Set<string>,
) {
  const name = filename.split(/[/\\]/).pop() ?? "";
  if (name.split(".").length > 2) {
    throw validationError({ file: "double extension not allowed" });
  }
  const fromName = name.includes(".")
    ? name.slice(name.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (fromName && !allowed.has(fromName)) {
    throw validationError({ file: "file type not allowed" });
  }
  const mimeOk =
    !mime ||
    [...allowed].some((ext) =>
      (MIME_FOR[ext] ?? []).includes(mime.toLowerCase()),
    );
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

  if (isPdf) {
    if (!allowed.has("pdf")) throw validationError({ file: "file type not allowed" });
    return "pdf";
  }
  if (isPng) {
    if (!allowed.has("png")) throw validationError({ file: "file type not allowed" });
    return "png";
  }
  if (isJpeg) {
    if (!allowed.has("jpg") && !allowed.has("jpeg")) {
      throw validationError({ file: "file type not allowed" });
    }
    return "jpg";
  }
  if (fromName && allowed.has(fromName) && mimeOk) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
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
  const allowed = await allowedUploadExts(input.campusId);
  const ext = sniffExt(input.bytes, input.filename, input.mime, allowed);
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
