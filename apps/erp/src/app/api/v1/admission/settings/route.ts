import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  applicationFeeAmount,
  setApplicationFee,
} from "@/lib/services/applications";

const patchSchema = z.object({
  applicationFee: z.union([z.number(), z.string()]),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "view",
    );
    const fee = await applicationFeeAmount(user.campusId);
    return ok({ applicationFee: fee.toString() });
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
    const fee = await setApplicationFee(user.campusId, body.applicationFee);
    return ok({ applicationFee: fee.toString() });
  } catch (error) {
    return fail(error);
  }
}
