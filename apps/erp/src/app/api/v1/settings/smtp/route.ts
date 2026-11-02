import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { saveSmtpConfig, smtpPublicStatus } from "@/lib/smtp";

const patchSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
  from: z.string().optional(),
  secure: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "view",
    );
    return ok(await smtpPublicStatus(user.campusId));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "edit",
    );
    const body = patchSchema.parse(await readJson(request));
    await saveSmtpConfig(user.campusId, body);
    return ok(await smtpPublicStatus(user.campusId));
  } catch (error) {
    return fail(error);
  }
}
