import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { sectionInCampus } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const patchSchema = z.object({ specializationId: z.string().min(1).nullable() });

/** Assigns a section to one of its program's specializations (major/minor), or clears it. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission(request, "academics", "section", "create");
    const section = await sectionInCampus(user.campusId, (await context.params).id);
    const body = patchSchema.parse(await readJson(request));
    if (body.specializationId) {
      const spec = await prisma.specialization.findFirst({ where: { id: body.specializationId, programId: section.class.programId } });
      if (!spec) throw validationError({ specializationId: "must be a specialization of this section's program" });
    }
    const row = await prisma.section.update({ where: { id: section.id }, data: { specializationId: body.specializationId } });
    await writeAudit({
      userId: user.id,
      campusId: user.campusId,
      action: "update",
      entity: "section",
      entityId: row.id,
      before: { specializationId: section.specializationId },
      after: { specializationId: row.specializationId },
      ip: requestIp(request),
    });
    return ok(row);
  } catch (error) {
    return fail(error);
  }
}
