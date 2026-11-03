import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { forbidden } from "@/lib/errors";
import { isRegisterScreenKey } from "@/lib/services/registers";

const createSchema = z.object({
  screenKey: z.string().min(1),
  title: z.string().min(1),
  payload: z.record(z.string(), z.any()).default({}),
});

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const screenKey = new URL(request.url).searchParams.get("screenKey");
    if (!screenKey || isRegisterScreenKey(screenKey)) return ok({ data: [] });
    const data = await prisma.screenRecord.findMany({
      where: { campusId: user.campusId, screenKey },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const body = createSchema.parse(await readJson(request));
    // Registers have their own validated API; this free-form store must not write into them.
    if (isRegisterScreenKey(body.screenKey)) throw forbidden("use /v1/registers for this record");
    const row = await prisma.screenRecord.create({
      data: {
        campusId: user.campusId,
        screenKey: body.screenKey,
        title: body.title,
        payload: body.payload,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}
