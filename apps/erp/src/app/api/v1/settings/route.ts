import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const EXTRA_KEYS = [
  "attendanceMode",
  "logo",
  "printHeader",
  "printFooter",
  "uploadTypes",
] as const;

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  sessionId: z.string().optional().nullable(),
  dateFormat: z.string().optional(),
  timezone: z.string().optional(),
  startWeek: z.number().int().min(0).max(6).optional(),
  currencyFormat: z.string().optional().nullable(),
  currencyPlace: z.string().optional(),
  attendanceMode: z.string().optional(),
  logo: z.string().optional().nullable(),
  printHeader: z.string().optional(),
  printFooter: z.string().optional(),
  uploadTypes: z.string().optional(),
});

async function extras(campusId: string) {
  const rows = await prisma.setting.findMany({
    where: {
      campusId,
      key: { in: EXTRA_KEYS.map((k) => `campus.${k}`) },
    },
  });
  const map: Record<string, unknown> = {};
  for (const row of rows) {
    map[row.key.replace(/^campus\./, "")] = row.value;
  }
  return map;
}

function campusPayload(
  campus: {
    name: string;
    code: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    currentSessionId: string | null;
    dateFormat: string;
    timezone: string;
    startWeek: number;
    currencyFormat: string | null;
    currencyPlace: string;
  },
  extra: Record<string, unknown>,
) {
  return {
    name: campus.name,
    code: campus.code,
    address: campus.address,
    phone: campus.phone,
    email: campus.email,
    sessionId: campus.currentSessionId,
    dateFormat: campus.dateFormat,
    timezone: campus.timezone,
    startWeek: campus.startWeek,
    currencyFormat: campus.currencyFormat,
    currencyPlace: campus.currencyPlace,
    attendanceMode: extra.attendanceMode ?? "daily",
    logo: extra.logo ?? null,
    printHeader: extra.printHeader ?? campus.name,
    printFooter: extra.printFooter ?? campus.address ?? "",
    uploadTypes: extra.uploadTypes ?? "pdf,jpg,jpeg,png",
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "view",
    );
    const campus = await prisma.campus.findUnique({
      where: { id: user.campusId },
    });
    if (!campus) throw notFound("campus");
    return ok(campusPayload(campus, await extras(user.campusId)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "edit",
    );
    const body = patchSchema.parse(await readJson(request));
    const campus = await prisma.campus.update({
      where: { id: user.campusId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.code !== undefined ? { code: body.code } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.email !== undefined
          ? { email: body.email === "" ? null : body.email }
          : {}),
        ...(body.sessionId !== undefined
          ? { currentSessionId: body.sessionId }
          : {}),
        ...(body.dateFormat !== undefined ? { dateFormat: body.dateFormat } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.startWeek !== undefined ? { startWeek: body.startWeek } : {}),
        ...(body.currencyFormat !== undefined
          ? { currencyFormat: body.currencyFormat }
          : {}),
        ...(body.currencyPlace !== undefined
          ? { currencyPlace: body.currencyPlace }
          : {}),
      },
    });
    for (const key of EXTRA_KEYS) {
      if (body[key] === undefined) continue;
      await prisma.setting.upsert({
        where: {
          campusId_key: { campusId: user.campusId, key: `campus.${key}` },
        },
        update: { value: body[key] as never },
        create: {
          campusId: user.campusId,
          key: `campus.${key}`,
          value: body[key] as never,
        },
      });
    }
    return ok(campusPayload(campus, await extras(user.campusId)));
  } catch (error) {
    return fail(error);
  }
}
