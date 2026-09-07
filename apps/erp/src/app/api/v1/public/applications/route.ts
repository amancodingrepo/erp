import { created, fail, ok, readJson } from "@/lib/http";
import { rateLimited } from "@/lib/errors";
import { hitLoginRateLimit } from "@/lib/rate-limit-db";
import {
  applicationCreateSchema,
  publicCampus,
  submitApplication,
} from "@/lib/services/applications";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (await hitLoginRateLimit(`apply:${ip}`, 20)) {
      throw rateLimited();
    }
    const campus = await publicCampus();
    const body = applicationCreateSchema.parse(await readJson(request));
    const row = await submitApplication(campus.id, body);
    return created({
      id: row.id,
      applicationNo: row.applicationNo,
      paymentStatus: row.paymentStatus,
      status: row.status,
      feeAmount: row.feeAmount.toString(),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function GET(request: Request) {
  try {
    const ref = new URL(request.url).searchParams.get("ref")?.trim();
    if (!ref) return ok({ data: null });
    const campus = await publicCampus();
    const { prisma } = await import("@/lib/db");
    const row = await prisma.application.findFirst({
      where: { campusId: campus.id, applicationNo: ref },
      include: { program: { select: { name: true } } },
    });
    if (!row) return ok({ data: null });
    return ok({
      data: {
        applicationNo: row.applicationNo,
        name: [row.firstName, row.lastName].filter(Boolean).join(" "),
        paymentStatus: row.paymentStatus,
        status: row.status,
        feeAmount: row.feeAmount.toString(),
        program: row.program?.name ?? null,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
