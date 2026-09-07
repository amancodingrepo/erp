import { ProgramOutcomeKind } from "@prisma/client";
import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  createProgramOutcome,
  listProgramOutcomes,
} from "@/lib/services/copo";

const bodySchema = z.object({
  programId: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  kind: z.nativeEnum(ProgramOutcomeKind).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    const programId = new URL(request.url).searchParams.get("programId") ?? undefined;
    const rows = await listProgramOutcomes(user.campusId, programId);
    return ok({
      data: rows.map((r) => ({
        id: r.id,
        code: r.code,
        title: r.title,
        kind: r.kind,
        program: r.program,
        indirect: r.indirect ? r.indirect.percent.toString() : null,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await createProgramOutcome(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
