import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachClassFlags,
  listClassFlags,
  saveClassFlags,
} from "@/lib/services/campus-comms";
import {
  attachClassDates,
  listOpeningDates,
  listResultDates,
} from "@/lib/services/campus-class-dates";
import {
  attachClassTeachers,
  listClassTeachers,
  viewingSessionId,
} from "@/lib/services/session-context";

const createSchema = z.object({
  programId: z.string().min(1),
  name: z.string().min(1),
  yearNo: z.number().int().optional(),
  sectionNames: z.array(z.string()).optional(),
  isOtherCourse: z.boolean().optional(),
  sendAbsentSms: z.boolean().optional(),
  virtualClassroom: z.boolean().optional(),
  sequenceNo: z.number().int().optional(),
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
    const includeInactive =
      params.get("inactive") === "1" || params.get("all") === "1";
    const sessionId = await viewingSessionId(request, user);
    const [data, teachers, staff, flags, resultDates, openingDates] = await Promise.all([
      prisma.class.findMany({
        where: {
          program: { department: { campusId: user.campusId } },
          ...(programId ? { programId } : {}),
          ...(includeInactive ? {} : { isActive: true }),
        },
        include: { sections: true, program: true },
        orderBy: { sequenceNo: "asc" },
      }),
      listClassTeachers(user.campusId),
      prisma.staff.findMany({
        where: { campusId: user.campusId },
        select: { id: true, firstName: true, lastName: true },
      }),
      listClassFlags(user.campusId),
      listResultDates(user.campusId),
      listOpeningDates(user.campusId),
    ]);
    return ok({
      data: attachClassDates(
        attachClassFlags(attachClassTeachers(data, teachers, staff), flags),
        resultDates,
        openingDates,
      ),
      sessionId,
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
      "class",
      "create",
    );
    const body = createSchema.parse(await readJson(request));
    const program = await prisma.program.findFirst({
      where: {
        id: body.programId,
        department: { campusId: user.campusId },
      },
    });
    if (!program) throw notFound("program");
    const row = await prisma.class.create({
      data: {
        programId: body.programId,
        name: body.name,
        yearNo: body.yearNo,
        sequenceNo: body.sequenceNo ?? 0,
        isOtherCourse: body.isOtherCourse ?? false,
        sections: body.sectionNames?.length
          ? {
              create: body.sectionNames.map((name) => ({ name })),
            }
          : undefined,
      },
      include: { sections: true },
    });
    if (body.sendAbsentSms || body.virtualClassroom) {
      await saveClassFlags(user.campusId, {
        classId: row.id,
        sendAbsentSms: body.sendAbsentSms,
        virtualClassroom: body.virtualClassroom,
      });
    }
    return created({
      ...row,
      sendAbsentSms: Boolean(body.sendAbsentSms),
      virtualClassroom: Boolean(body.virtualClassroom),
    });
  } catch (error) {
    return fail(error);
  }
}
