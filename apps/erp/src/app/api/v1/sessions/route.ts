import { z } from "zod";
import { currentSessionId } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { viewingSessionId } from "@/lib/services/session-context";
import {
  attachSessionPrefixes,
  listSessionPrefixes,
  saveSessionPrefix,
} from "@/lib/services/campus-session-prefixes";

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  sequenceNo: z.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  receiptPrefix: z.string().optional(),
  invoicePrefix: z.string().optional(),
  admissionPrefix: z.string().optional(),
  firstAdmissionNo: z.number().int().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "view",
    );
    const sessions = await prisma.academicSession.findMany({
      where: { campusId: user.campusId },
      orderBy: { sequenceNo: "desc" },
    });
    const prefixes = await listSessionPrefixes(user.campusId);
    return ok({
      data: attachSessionPrefixes(sessions, prefixes),
      currentSessionId: await currentSessionId(user),
      viewingSessionId: await viewingSessionId(request, user),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "create",
    );
    const body = createSchema.parse(await readJson(request));
    const session = await prisma.academicSession.create({
      data: {
        campusId: user.campusId,
        name: body.name,
        code: body.code,
        sequenceNo: body.sequenceNo ?? 0,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    if (
      body.receiptPrefix ||
      body.invoicePrefix ||
      body.admissionPrefix ||
      body.firstAdmissionNo
    ) {
      await saveSessionPrefix(user.campusId, {
        sessionId: session.id,
        receiptPrefix: body.receiptPrefix,
        invoicePrefix: body.invoicePrefix,
        admissionPrefix: body.admissionPrefix,
        firstAdmissionNo: body.firstAdmissionNo,
      });
    }
    const [attached] = attachSessionPrefixes(
      [session],
      await listSessionPrefixes(user.campusId),
    );
    return created(attached ?? session);
  } catch (error) {
    return fail(error);
  }
}
