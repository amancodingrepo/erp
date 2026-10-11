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
  mp3: ["audio/mpeg", "audio/mp3"],
  wav: ["audio/wav", "audio/x-wav", "audio/wave"],
  mp4: ["video/mp4"],
  webm: ["video/webm"],
};
const MIME_OUT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",
};

export type CampusFileKind =
  | "diary"
  | "notice"
  | "staff"
  | "student"
  | "website"
  | "eyfs"
  | "guardian"
  | "general";

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

export function sniffUploadExt(
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
  const isWav =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45;
  const isMp4 =
    bytes.length >= 8 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70;
  const isWebm =
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3;
  const isMp3 =
    (bytes.length >= 3 &&
      bytes[0] === 0x49 &&
      bytes[1] === 0x44 &&
      bytes[2] === 0x33) ||
    (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);

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
  if (isWav) {
    if (!allowed.has("wav")) throw validationError({ file: "file type not allowed" });
    return "wav";
  }
  if (isMp4) {
    if (!allowed.has("mp4")) throw validationError({ file: "file type not allowed" });
    return "mp4";
  }
  if (isWebm) {
    if (!allowed.has("webm")) throw validationError({ file: "file type not allowed" });
    return "webm";
  }
  if (isMp3) {
    if (!allowed.has("mp3")) throw validationError({ file: "file type not allowed" });
    return "mp3";
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
  const written = await writeCampusBytes({
    campusId: input.campusId,
    kind: "student",
    ownerId: input.studentId,
    filename: input.filename,
    mime: input.mime,
    bytes: input.bytes,
  });
  const fileUrl = path.posix.join("uploads", written.relPath);
  return { fileUrl, abs: written.abs, id: written.id };
}

export async function writeCampusBytes(input: {
  campusId: string;
  kind: CampusFileKind;
  ownerId?: string;
  filename: string;
  mime: string;
  bytes: Uint8Array;
  extraExts?: string[];
}) {
  if (input.bytes.byteLength > MAX_BYTES) {
    throw validationError({ file: "file exceeds 5MB" });
  }
  const allowed = await allowedUploadExts(input.campusId);
  for (const ext of input.extraExts ?? []) allowed.add(ext.toLowerCase());
  const ext = sniffUploadExt(input.bytes, input.filename, input.mime, allowed);
  const id = randomUUID();
  const folder = input.kind === "student" ? "students" : input.kind;
  const parts = input.ownerId
    ? [input.campusId, folder, input.ownerId]
    : [input.campusId, folder];
  const dir = path.join(uploadsRoot(), ...parts);
  await mkdir(dir, { recursive: true });
  const stored = `${id}.${ext}`;
  const abs = path.join(dir, stored);
  await writeFile(abs, input.bytes);
  return {
    id,
    ext,
    mime: MIME_OUT[ext] || input.mime || "application/octet-stream",
    relPath: path.posix.join(...parts, stored),
    abs,
  };
}
