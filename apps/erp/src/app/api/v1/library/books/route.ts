import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createBook, listBooks } from "@/lib/services/library";

const bodySchema = z.object({
  title: z.string().min(1),
  isbn: z.string().optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  qty: z.number().int().min(1),
  rack: z.string().optional(),
  price: z.union([z.number(), z.string()]).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listBooks(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await createBook(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
