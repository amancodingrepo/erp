import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { conflict, validationError } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({ programId: z.string().min(1), name: z.string().trim().min(1).max(120) });

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "program", "view");
    const programId = new URL(request.url).searchParams.get("programId") || undefined;
    const rows = await prisma.specialization.findMany({
      where: { program: { department: { campusId: user.campusId } }, ...(programId ? { programId } : {}) },
      include: { program: { select: { name: true } } },
      orderBy: [{ program: { name: "asc" } }, { name: "asc" }],
    });
    const ids = rows.map((row) => row.id);
    const used = ids.length
      ? await prisma.section.groupBy({ by: ["specializationId"], where: { specializationId: { in: ids } }, _count: { _all: true } })
      : [];
    const counts = new Map(used.map((row) => [row.specializationId, row._count._all]));
    return ok({
      data: rows.map((row) => ({ id: row.id, programId: row.programId, program: row.program.name, name: row.name, sections: counts.get(row.id) ?? 0 })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "academics", "program", "create");
    const body = createSchema.parse(await readJson(request));
    const program = await prisma.program.findFirst({ where: { id: body.programId, department: { campusId: user.campusId } } });
    if (!program) throw validationError({ programId: "program was not found in this campus" });
    const clash = await prisma.specialization.findFirst({ where: { programId: program.id, name: { equals: body.name, mode: "insensitive" } } });
    if (clash) throw conflict("this program already has that specialization");
    const row = await prisma.specialization.create({ data: { programId: program.id, name: body.name } });
    await writeAudit({ userId: user.id, campusId: user.campusId, action: "create", entity: "specialization", entityId: row.id, after: row, ip: requestIp(request) });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}
