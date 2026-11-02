import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseLibraryAccession } from "@/lib/services/campus-spec-aliases";
import {
  listBookAccessions,
  writeBookAccession,
} from "@/lib/services/campus-later";
import { listBooks } from "@/lib/services/library";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const [rows, books] = await Promise.all([
      listBookAccessions(user.campusId),
      listBooks(user.campusId),
    ]);
    const byId = new Map(books.map((book) => [book.id, book.title]));
    return ok({
      data: rows.map((row) => ({
        ...row,
        title: byId.get(row.bookId) ?? null,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseLibraryAccession(await readJson(request));
    const book = await prisma.book.findFirst({
      where: { id: body.bookId, campusId: user.campusId },
      select: { id: true },
    });
    if (!book) throw notFound("book");
    const rows = await writeBookAccession(user.campusId, book.id);
    return created(rows.find((row) => row.bookId === book.id)!);
  } catch (error) {
    return fail(error);
  }
}
