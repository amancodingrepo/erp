import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createHostel, vacancy } from "@/lib/services/campus-housing";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  name: z.string().min(1),
  feeAmount: z.union([z.number(), z.string()]),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const data = await prisma.hostel.findMany({
      where: { campusId: user.campusId },
      include: { rooms: true },
      orderBy: { name: "asc" },
    });
    return ok({ data, vacancy: await vacancy(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await createHostel(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
