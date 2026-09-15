import { prisma } from "@/lib/db";
import { decryptField, encryptField } from "@/lib/crypto";

export type SmtpConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from?: string;
  secure: boolean;
};

async function fromCampus(campusId: string): Promise<SmtpConfig | null> {
  const rows = await prisma.setting.findMany({
    where: { campusId, key: { startsWith: "smtp." } },
  });
  const map: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.replace(/^smtp\./, "");
    map[key] = typeof row.value === "string" ? row.value : String(row.value ?? "");
  }
  if (!map.host && !process.env.SMTP_HOST) return null;
  const host = process.env.SMTP_HOST || map.host;
  if (!host) return null;
  const pass = process.env.SMTP_PASS || decryptField(map.pass) || map.pass;
  return {
    host,
    port: Number(process.env.SMTP_PORT || map.port || "587"),
    user: process.env.SMTP_USER || map.user || undefined,
    pass: pass || undefined,
    from: process.env.SMTP_FROM || map.from || process.env.SMTP_USER || map.user,
    secure:
      process.env.SMTP_SECURE === "true" ||
      map.secure === "true" ||
      Number(process.env.SMTP_PORT || map.port || "587") === 465,
  };
}

export async function loadSmtpConfig(campusId?: string | null) {
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? "587"),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      secure:
        process.env.SMTP_SECURE === "true" ||
        Number(process.env.SMTP_PORT ?? "587") === 465,
    } satisfies SmtpConfig;
  }
  if (campusId) {
    const cfg = await fromCampus(campusId);
    if (cfg) return cfg;
  }
  const any = await prisma.setting.findFirst({
    where: { key: "smtp.host" },
  });
  if (any) return fromCampus(any.campusId);
  return null;
}

export async function saveSmtpConfig(
  campusId: string,
  input: {
    host: string;
    port?: number;
    user?: string;
    pass?: string;
    from?: string;
    secure?: boolean;
  },
) {
  const pairs: Array<[string, string]> = [
    ["smtp.host", input.host.trim()],
    ["smtp.port", String(input.port ?? 587)],
    ["smtp.user", input.user?.trim() ?? ""],
    ["smtp.from", input.from?.trim() ?? ""],
    ["smtp.secure", input.secure ? "true" : "false"],
  ];
  if (input.pass?.trim()) {
    pairs.push(["smtp.pass", encryptField(input.pass.trim()) ?? ""]);
  }
  for (const [key, value] of pairs) {
    await prisma.setting.upsert({
      where: { campusId_key: { campusId, key } },
      update: { value },
      create: { campusId, key, value },
    });
  }
}

export async function smtpPublicStatus(campusId: string) {
  const cfg = await loadSmtpConfig(campusId);
  return {
    configured: Boolean(cfg?.host),
    host: cfg?.host ?? "",
    port: cfg?.port ?? 587,
    user: cfg?.user ?? "",
    from: cfg?.from ?? "",
    secure: Boolean(cfg?.secure),
    hasPassword: Boolean(cfg?.pass),
  };
}
