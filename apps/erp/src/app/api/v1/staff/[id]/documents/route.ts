import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listStaffDocumentsFor,
  saveStaffDocument,
} from "@/lib/services/campus-staff-docs";

const bodySchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  id: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const { id } = await context.params;
    const row = await listStaffDocumentsFor(user.campusId, id);
    return ok({ data: row.documents, staffId: row.staffId });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return created(await saveStaffDocument(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}
