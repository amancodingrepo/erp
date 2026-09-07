import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { prisma } from "@/lib/db";
import { generateMeritList } from "@/lib/services/merit";

const bodySchema = z.object({
  programId: z.string().min(1),
  roundNo: z.number().int().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "view",
    );
    const params = new URL(request.url).searchParams;
    const programId = params.get("programId") ?? undefined;
    const round = params.get("roundNo");
    const rows = await prisma.application.findMany({
      where: {
        campusId: user.campusId,
        ...(programId ? { programId } : {}),
        ...(round ? { cutoffRound: Number(round) } : {}),
        selectionStatus: { not: "PENDING" },
      },
      include: { program: { select: { name: true } } },
      orderBy: [{ meritRank: "asc" }, { createdAt: "asc" }],
    });
    return ok({
      data: rows.map((r) => ({
        id: r.id,
        applicationNo: r.applicationNo,
        name: [r.firstName, r.lastName].filter(Boolean).join(" "),
        categoryCode: r.categoryCode,
        score: r.score?.toString() ?? null,
        meritRank: r.meritRank,
        selectionStatus: r.selectionStatus,
        program: r.program?.name ?? null,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const body = bodySchema.parse(await readJson(request));
    const result = await generateMeritList({
      campusId: user.campusId,
      programId: body.programId,
      roundNo: body.roundNo,
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
