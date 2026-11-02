import { z } from "zod";
import { currentSessionId, sessionInCampus } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  viewingSessionId,
} from "@/lib/services/session-context";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const [sessions, current, viewing] = await Promise.all([
      prisma.academicSession.findMany({
        where: { campusId: user.campusId },
        orderBy: { sequenceNo: "desc" },
      }),
      currentSessionId(user),
      viewingSessionId(request, user),
    ]);
    return ok({
      data: sessions,
      currentSessionId: current,
      viewingSessionId: viewing,
    });
  } catch (error) {
    return fail(error);
  }
}

const bodySchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const body = bodySchema.parse(await readJson(request));
    await sessionInCampus(user.campusId, body.sessionId);
    const response = ok({ viewingSessionId: body.sessionId });
    response.cookies.set(
      SESSION_COOKIE,
      body.sessionId,
      sessionCookieOptions(),
    );
    return response;
  } catch (error) {
    return fail(error);
  }
}
