import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  programId: z.string().min(1),
  name: z.string().min(1),
  yearNo: z.number().int().optional(),
  sectionNames: z.array(z.string()).optional(),
  isOtherCourse: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "class",
      "view",
    );
    const params = new URL(request.url).searchParams;
    const programId = params.get("programId") ?? undefined;
    const data = await prisma.class.findMany({
      where: {
        program: { department: { campusId: user.campusId } },
        ...(programId ? { programId } : {}),
      },
      include: { sections: true, program: true },
      orderBy: { sequenceNo: "asc" },
    });
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiPermission(request, "academics", "class", "create");
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.class.create({
      data: {
        programId: body.programId,
        name: body.name,
        yearNo: body.yearNo,
        isOtherCourse: body.isOtherCourse ?? false,
        sections: body.sectionNames?.length
          ? {
              create: body.sectionNames.map((name) => ({ name })),
            }
          : undefined,
      },
      include: { sections: true },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}
