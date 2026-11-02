import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachFeeConcessions,
  parseFeeConcession,
} from "@/lib/services/campus-spec-aliases";
import {
  listConcessions,
  saveConcession,
} from "@/lib/services/fees-concessions";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const data = await listConcessions(user.campusId);
    return ok({ data: attachFeeConcessions(data) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const body = parseFeeConcession(await readJson(request));
    return created(
      attachFeeConcessions([await saveConcession(user.campusId, body)])[0],
    );
  } catch (error) {
    return fail(error);
  }
}
