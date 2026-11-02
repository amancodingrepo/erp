import { currentSessionId } from "@/lib/campus";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachSessionPrefixes,
  listSessionPrefixes,
  saveSessionPrefix,
} from "@/lib/services/campus-session-prefixes";
import {
  parseAcademicYearCreate,
  setCurrentSession,
  toAcademicYear,
  viewingSessionId,
} from "@/lib/services/session-context";

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
    const years = sessions.map((row) => toAcademicYear(row, sessions));
    return ok({
      data: attachSessionPrefixes(years, prefixes),
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
    const body = parseAcademicYearCreate(await readJson(request));
    const session = await prisma.academicSession.create({
      data: {
        campusId: user.campusId,
        name: body.name,
        code: body.code,
        sequenceNo: body.sequenceNo,
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
    const current = body.isCurrent
      ? await setCurrentSession(user.campusId, session.id)
      : session;
    const sessions = await prisma.academicSession.findMany({
      where: { campusId: user.campusId },
      select: { id: true, sequenceNo: true },
    });
    const [attached] = attachSessionPrefixes(
      [toAcademicYear(current ?? session, sessions)],
      await listSessionPrefixes(user.campusId),
    );
    return created(attached ?? current ?? session);
  } catch (error) {
    return fail(error);
  }
}
