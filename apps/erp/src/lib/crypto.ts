import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const DEV_KEY = "dev-only-field-encryption-key-not-for-production!!";

export function fieldEncryptionKeyBytes() {
  const raw = process.env.FIELD_ENCRYPTION_KEY ?? "";
  if (process.env.NODE_ENV === "production" && raw.length < 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be >= 32 chars in production");
  }
  return createHash("sha256")
    .update(raw || DEV_KEY)
    .digest();
}

/** AES-256-GCM. Stored as v1:iv:tag:cipher (base64 parts). */
export function encryptField(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", fieldEncryptionKeyBytes(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const [version, ivB64, tagB64, dataB64] = stored.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) return null;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    fieldEncryptionKeyBytes(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}

export function maskId(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\s+/g, "");
  if (digits.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}
