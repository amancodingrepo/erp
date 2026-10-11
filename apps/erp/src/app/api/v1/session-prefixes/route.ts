import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listSessionPrefixes,
  saveSessionPrefix,
} from "@/lib/services/campus-session-prefixes";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  receiptPrefix: z.string().optional(),
  invoicePrefix: z.string().optional(),
  admissionPrefix: z.string().optional(),
  firstAdmissionNo: z.number().int().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "view",
    );
    return ok({ data: await listSessionPrefixes(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "create",
    );
    const body = bodySchema.parse(await readJson(request));
    return created(await saveSessionPrefix(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
