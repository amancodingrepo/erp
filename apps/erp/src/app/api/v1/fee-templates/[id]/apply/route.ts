import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  parseFeeTemplateApply,
  resolveApplyClassIds,
} from "@/lib/services/campus-spec-aliases";
import { assignMasterToClass } from "@/lib/services/fees";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const { id } = await context.params;
    const parsed = parseFeeTemplateApply(await readJson(request));
    const targets = await resolveApplyClassIds(user.campusId, parsed);
    let created = 0;
    const invoiceIds: string[] = [];
    for (const target of targets) {
      const result = await assignMasterToClass({
        campusId: user.campusId,
        masterId: id,
        classId: target.classId,
        sectionId: parsed.sectionId ?? target.sectionId,
        sessionId: parsed.sessionId,
      });
      created += result.created;
      invoiceIds.push(...result.invoiceIds);
    }
    return ok({ created, invoiceIds });
  } catch (error) {
    return fail(error);
  }
}
