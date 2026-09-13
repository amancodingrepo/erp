import { fail, ok } from "@/lib/http";
import {
  applicationFeeAmount,
  listPublicPrograms,
  publicCampus,
} from "@/lib/services/applications";

export async function GET(request?: Request) {
  try {
    const code = request
      ? new URL(request.url).searchParams.get("campus")
      : null;
    const campus = await publicCampus(code);
    const [programs, fee] = await Promise.all([
      listPublicPrograms(campus.id),
      applicationFeeAmount(campus.id),
    ]);
    return ok({
      campus: { name: campus.name, code: campus.code },
      applicationFee: fee.toString(),
      programs,
    });
  } catch (error) {
    return fail(error);
  }
}
