import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listCutoffs, upsertCutoff } from "@/lib/services/merit";

const bodySchema = z.object({
  programId: z.string().min(1),
  roundNo: z.number().int().min(1),
  categoryCode: z.string().min(1),
  minScore: z.union([z.number(), z.string()]),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "view",
    );
    const programId =
      new URL(request.url).searchParams.get("programId") ?? undefined;
    const rows = await listCutoffs(user.campusId, programId);
    return ok({
      data: rows.map((r) => ({
        id: r.id,
        programId: r.programId,
        program: r.program.name,
        roundNo: r.roundNo,
        categoryCode: r.categoryCode,
        minScore: r.minScore.toString(),
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
    const row = await upsertCutoff(user.campusId, body);
    return created({
      id: row.id,
      roundNo: row.roundNo,
      categoryCode: row.categoryCode,
      minScore: row.minScore.toString(),
    });
  } catch (error) {
    return fail(error);
  }
}
