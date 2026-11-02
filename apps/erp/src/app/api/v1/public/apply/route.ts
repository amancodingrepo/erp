import { fail, ok } from "@/lib/http";
import { openFormCatalog } from "@/lib/services/admission-forms";
import {
  applicationFeeAmount,
  listPublicPrograms,
  publicCampus,
} from "@/lib/services/applications";

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("campus");
    const campus = await publicCampus(code);
    const [programs, fee, catalog] = await Promise.all([
      listPublicPrograms(campus.id),
      applicationFeeAmount(campus.id),
      openFormCatalog(campus.id, "admission"),
    ]);
    return ok({
      campus: { name: campus.name, code: campus.code },
      applicationFee: fee.toString(),
      programs,
      form: catalog.form,
      fields: catalog.fields,
    });
  } catch (error) {
    return fail(error);
  }
}
