import { createHash } from "crypto";
import { prisma } from "./db";
import { HttpError } from "./errors";

/** Setting key that holds each school's School World settings, including the logo. */
export const SCHOOL_CONFIG_KEY = "school-world-config";

export const LOGO_MAX_BYTES = 1024 * 1024;
// No SVG: it can carry script, and the logo is served from this site's own origin.
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Checks a logo data URL (PNG, JPEG or WebP, at most 1 MB) and returns its type and bytes. */
export function parseLogoDataUrl(value: unknown) {
  const match = /^data:([a-z0-9.+/-]+);base64,([a-z0-9+/=\s]+)$/i.exec(String(value ?? ""));
  if (!match) throw new HttpError(400, "validation_error", "The logo must be an uploaded PNG, JPEG or WebP image.");
  const mime = match[1].toLowerCase();
  if (!LOGO_TYPES.has(mime)) throw new HttpError(400, "validation_error", "The logo must be a PNG, JPEG or WebP image.");
  const bytes = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
  if (!bytes.length) throw new HttpError(400, "validation_error", "The logo image is empty.");
  if (bytes.length > LOGO_MAX_BYTES) throw new HttpError(413, "payload_too_large", "The logo must be 1 MB or smaller.");
  const signature: Record<string, (b: Buffer) => boolean> = {
    "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    "image/webp": (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  };
  if (!signature[mime](bytes)) throw new HttpError(400, "validation_error", "The logo file does not match its image type.");
  return { mime, bytes };
}

async function schoolConfig(campusId: string) {
  const row = await prisma.setting.findUnique({ where: { campusId_key: { campusId, key: SCHOOL_CONFIG_KEY } } });
  return row?.value && typeof row.value === "object" && !Array.isArray(row.value) ? (row.value as Record<string, unknown>) : {};
}

/** The school's logo as stored, or null. */
export async function schoolLogo(campusId: string) {
  const logo = (await schoolConfig(campusId)).logoDataUrl;
  if (typeof logo !== "string" || !logo) return null;
  try {
    return parseLogoDataUrl(logo);
  } catch {
    return null;
  }
}

/**
 * Branding sent with the signed-in user. The logo goes by URL (with a version so a new upload is
 * fetched) rather than inline, so every session check stays small.
 */
export async function schoolBranding(campusId: string) {
  const logo = (await schoolConfig(campusId)).logoDataUrl;
  const version = typeof logo === "string" && logo ? createHash("sha1").update(logo).digest("hex").slice(0, 12) : "";
  return { logoUrl: version ? "/api/school/logo?v=" + version : "" };
}
