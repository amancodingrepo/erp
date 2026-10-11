import { ActorType } from "@prisma/client";
import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { requirePermission } from "@/lib/permissions";
import {
  REQUEST_CATEGORIES,
  composeRequest,
  listRequests,
  type RequestFolder,
} from "@/lib/services/diary";

const FOLDERS: RequestFolder[] = ["inbox", "sent", "scheduled", "unseen"];

const createSchema = z.object({
  body: z.string().min(1),
  studentId: z.string().optional(),
  recipientUserId: z.string().optional(),
  classId: z.string().optional(),
  category: z.enum(REQUEST_CATEGORIES).optional(),
  hashTag: z.string().optional(),
  attachmentUrl: z.string().optional(),
  scheduledAt: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    if (user.actorType === ActorType.STAFF) {
      requirePermission(user, "communicate", "notice", "view");
    }
    const url = new URL(request.url);
    const folderParam = url.searchParams.get("folder") ?? "inbox";
    const folder = FOLDERS.includes(folderParam as RequestFolder)
      ? (folderParam as RequestFolder)
      : "inbox";
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
    return ok({ data });
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
    const body = createSchema.parse(await readJson(request));
    return created(await composeRequest(user, body));
  } catch (error) {
    return fail(error);
  }
}
