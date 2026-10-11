import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  assignSponsor,
  createCorporate,
  listCorporates,
  listSponsors,
} from "@/lib/services/campus-later";

const bodySchema = z.object({
  name: z.string().optional(),
  studentId: z.string().optional(),
  corporateId: z.string().optional(),
  amount: z.number().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "view",
    );
    const [corporates, sponsors] = await Promise.all([
      listCorporates(user.campusId),
      listSponsors(user.campusId),
    ]);
    return ok({ data: corporates, sponsors });
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
    if (body.studentId && body.corporateId) {
      return created(
        await assignSponsor(user.campusId, {
          studentId: body.studentId,
          corporateId: body.corporateId,
          amount: body.amount,
        }),
      );
    }
    return created(await createCorporate(user.campusId, body.name ?? ""));
  } catch (error) {
    return fail(error);
  }
}
