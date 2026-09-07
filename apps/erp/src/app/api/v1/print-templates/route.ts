import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listCertificateIssues,
  listPrintTemplates,
  upsertPrintTemplate,
} from "@/lib/services/print-docs";

const bodySchema = z.object({
  kind: z.enum(["CERTIFICATE", "ID_CARD", "STAFF_ID"]),
  name: z.string().min(1),
  body: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const kind = new URL(request.url).searchParams.get("kind") ?? undefined;
    if (kind === "issues") {
      return ok({ data: await listCertificateIssues(user.campusId) });
    }
    return ok({ data: await listPrintTemplates(user.campusId, kind ?? undefined) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await upsertPrintTemplate(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
