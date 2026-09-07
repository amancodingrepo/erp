import { fail, ok } from "@/lib/http";
import {
  applicationFeeAmount,
  listPublicPrograms,
  publicCampus,
} from "@/lib/services/applications";

export async function GET() {
  try {
    const campus = await publicCampus();
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
