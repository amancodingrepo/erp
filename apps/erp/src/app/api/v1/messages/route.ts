import { ActorType } from "@prisma/client";
import { created, fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { requirePermission } from "@/lib/permissions";
import {
  parseMessageBox,
  parseMessageCompose,
} from "@/lib/services/campus-spec-aliases";
import {
  composeRequest,
  listRequests,
  type RequestFolder,
} from "@/lib/services/diary";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    if (user.actorType === ActorType.STAFF) {
      requirePermission(user, "communicate", "notice", "view");
    }
    const url = new URL(request.url);
    const folder = parseMessageBox(
      url.searchParams.get("box") ?? url.searchParams.get("folder"),
    ) as RequestFolder;
    const data = await listRequests(user, folder, {
      category: url.searchParams.get("category") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      classId: url.searchParams.get("classId") ?? undefined,
      firstName: url.searchParams.get("firstName") ?? undefined,
      lastName: url.searchParams.get("lastName") ?? undefined,
      fromDate: url.searchParams.get("fromDate") ?? undefined,
      toDate: url.searchParams.get("toDate") ?? undefined,
    });
    return ok({ data, box: folder });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    if (user.actorType === ActorType.STAFF) {
      requirePermission(user, "communicate", "notice", "create");
    }
    const body = parseMessageCompose(await readJson(request));
    return created(await composeRequest(user, body));
  } catch (error) {
    return fail(error);
  }
}
