import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  classId: z.string().min(1),
  name: z.string().min(1),
  specializationId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "section",
      "view",
    );
    const classId = new URL(request.url).searchParams.get("classId") ?? undefined;
    const data = await prisma.section.findMany({
      where: {
        class: { program: { department: { campusId: user.campusId } } },
        ...(classId ? { classId } : {}),
      },
      include: { class: true },
      orderBy: { name: "asc" },
    });
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiPermission(request, "academics", "section", "create");
    const body = createSchema.parse(await readJson(request));
    try {
      const row = await prisma.section.create({
        data: {
          classId: body.classId,
          name: body.name,
          specializationId: body.specializationId,
        },
      });
      return created(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw conflict("section name already exists in this class");
      }
      throw error;
    }
  } catch (error) {
    return fail(error);
  }
}
