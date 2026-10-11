import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  deleteLibraryCenter,
  listBookCenterAssigns,
  listLibraryCenters,
  saveBookCenterAssign,
  saveLibraryCenter,
} from "@/lib/services/campus-library-centers";

const createSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
});

const deleteSchema = z.object({
  id: z.string().min(1),
  deleted: z.boolean(),
});

const assignSchema = z.object({
  bookId: z.string().min(1),
  centerId: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const [data, assigns] = await Promise.all([
      listLibraryCenters(user.campusId),
      listBookCenterAssigns(user.campusId),
    ]);
    return ok({ data, assigns });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const json = await readJson(request);
    if (json && typeof json === "object" && "bookId" in json) {
      return created(await saveBookCenterAssign(user.campusId, assignSchema.parse(json)));
    }
    if (json && typeof json === "object" && "deleted" in json) {
      const body = deleteSchema.parse(json);
      return ok(await deleteLibraryCenter(user.campusId, body.id, body.deleted));
    }
    const body = createSchema.parse(json);
    return created(await saveLibraryCenter(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
