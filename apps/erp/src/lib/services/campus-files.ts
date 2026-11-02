import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import {
  uploadsRoot,
  writeCampusBytes,
  type CampusFileKind,
} from "@/lib/uploads";

export const FILES_KEY = "campus.files";
export const FILE_KINDS = [
  "diary",
  "notice",
  "staff",
  "student",
  "website",
  "eyfs",
  "guardian",
  "general",
] as const;
export type FileKind = (typeof FILE_KINDS)[number];

const KIND_EXTS: Record<FileKind, string[]> = {
  diary: ["pdf", "jpg", "jpeg", "png", "mp3", "wav", "mp4", "webm"],
  notice: ["pdf", "jpg", "jpeg", "png"],
  staff: ["pdf", "jpg", "jpeg", "png"],
  student: [],
  website: ["jpg", "jpeg", "png"],
  eyfs: ["pdf", "jpg", "jpeg", "png", "mp4", "webm"],
  guardian: ["jpg", "jpeg", "png"],
  general: [],
};

const KIND_ALIAS: Record<string, FileKind> = {
  photo: "diary",
  voice: "diary",
  video: "diary",
  pdf: "diary",
  document: "staff",
  image: "general",
};

export type CampusFile = {
  id: string;
  kind: FileKind;
  name: string;
  mime: string;
  relPath: string;
  url: string;
  bytes: number;
  at: string;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

const FILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function allowedMediaUrl(value: unknown) {
  const url = trim(value);
  if (!url) return "";
  if (url.includes("..") || url.includes("\\")) return "";
  if (url.startsWith("/api/v1/files/")) {
    const id = url.slice("/api/v1/files/".length).split(/[/?#]/)[0] ?? "";
    if (!FILE_ID.test(id)) return "";
    return `/api/v1/files/${id.toLowerCase()}`;
  }
  if (url.startsWith("uploads/")) {
    const parts = url.split("/").filter(Boolean);
    if (parts[0] !== "uploads" || parts.length < 3) return "";
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return parsed.toString();
  } catch {
    return "";
  }
  return "";
}

export function parseFileKind(value: unknown): FileKind {
  const raw = trim(value).toLowerCase();
  if (!raw) return "general";
  const aliased = KIND_ALIAS[raw] ?? raw;
  if (!FILE_KINDS.includes(aliased as FileKind)) {
    throw validationError({ kind: "invalid" });
  }
  return aliased as FileKind;
}

function fileUrl(id: string) {
  return `/api/v1/files/${id}`;
}

export function parseCampusFiles(value: unknown): CampusFile[] {
  if (!Array.isArray(value)) return [];
  const out: CampusFile[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = trim(rec.id).toLowerCase();
    const kind = trim(rec.kind) as FileKind;
    const name = trim(rec.name);
    const relPath = trim(rec.relPath);
    if (!FILE_ID.test(id) || !FILE_KINDS.includes(kind) || !name || !relPath) {
      continue;
    }
    if (relPath.includes("..") || relPath.includes("\\") || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      kind,
      name,
      mime: trim(rec.mime) || "application/octet-stream",
      relPath,
      url: fileUrl(id),
      bytes: Number(rec.bytes) || 0,
      at: trim(rec.at) || new Date(0).toISOString(),
    });
  }
  return out;
}

async function readFiles(campusId: string) {
  const row = await prisma.setting.findUnique({
    where: { campusId_key: { campusId, key: FILES_KEY } },
  });
  return parseCampusFiles(row?.value);
}

async function writeFiles(campusId: string, rows: CampusFile[]) {
  const value = rows.slice(-500) as unknown as Prisma.InputJsonValue;
  await prisma.setting.upsert({
    where: { campusId_key: { campusId, key: FILES_KEY } },
    update: { value },
    create: { campusId, key: FILES_KEY, value },
  });
}

export async function saveCampusFile(input: {
  campusId: string;
  kind?: string;
  name?: string;
  filename: string;
  mime: string;
  bytes: Uint8Array;
  ownerId?: string;
}) {
  const kind = parseFileKind(input.kind);
  const written = await writeCampusBytes({
    campusId: input.campusId,
    kind: kind as CampusFileKind,
    ownerId: input.ownerId,
    filename: input.filename,
    mime: input.mime,
    bytes: input.bytes,
    extraExts: KIND_EXTS[kind],
  });
  const row: CampusFile = {
    id: written.id,
    kind,
    name: trim(input.name) || trim(input.filename) || written.id,
    mime: written.mime,
    relPath: written.relPath,
    url: fileUrl(written.id),
    bytes: input.bytes.byteLength,
    at: new Date().toISOString(),
  };
  const next = [...(await readFiles(input.campusId)).filter((item) => item.id !== row.id), row];
  await writeFiles(input.campusId, next);
  return { ...row, abs: written.abs };
}

export async function getCampusFile(campusId: string, id: string) {
  const key = trim(id).toLowerCase();
  const row = (await readFiles(campusId)).find((item) => item.id === key);
  if (!row) throw notFound("file");
  return row;
}

export function resolveCampusFileAbs(campusId: string, file: CampusFile) {
  const root = path.resolve(uploadsRoot(), campusId);
  const abs = path.resolve(uploadsRoot(), file.relPath);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw notFound("file");
  }
  return abs;
}
