import { ActorType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { issuePasswordReset, randomPasswordHash } from "@/lib/password-reset";
import { requireApiPermission } from "@/lib/principal";

const PORTAL_ACTOR: Record<string, ActorType> = {
  Staff: ActorType.STAFF,
  Student: ActorType.STUDENT,
  Parent: ActorType.GUARDIAN,
  STAFF: ActorType.STAFF,
  STUDENT: ActorType.STUDENT,
  GUARDIAN: ActorType.GUARDIAN,
  staff: ActorType.STAFF,
  student: ActorType.STUDENT,
  parent: ActorType.GUARDIAN,
};

const createSchema = z.object({
  username: z.string().min(1),
  email: z.string().email().optional(),
  actorType: z.nativeEnum(ActorType).optional(),
  tab: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  staffId: z.string().optional(),
  studentId: z.string().optional(),
  guardianId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "users", "view");
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim();
    const tab = params.get("actorType") ?? params.get("tab") ?? "Staff";
    const actorType = PORTAL_ACTOR[tab] ?? ActorType.STAFF;
    const rows = await prisma.user.findMany({
      where: {
        campusId: user.campusId,
        actorType,
        ...(q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        roles: { include: { role: true } },
        staff: {
          include: { department: true, designation: true },
        },
        student: {
          include: {
            enrollments: {
              where: { isCurrent: true },
              include: { class: true, section: true },
              take: 1,
            },
          },
        },
        guardian: true,
      },
      orderBy: { username: "asc" },
    });
    return ok({
      data: rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        actorType: row.actorType,
        isActive: row.isActive,
        lastLoginAt: row.lastLoginAt,
        roles: row.roles.map((r) => ({ id: r.role.id, name: r.role.name })),
        staff: row.staff
          ? {
              id: row.staff.id,
              employeeId: row.staff.employeeId,
              name: [row.staff.firstName, row.staff.lastName]
                .filter(Boolean)
                .join(" "),
              phone: row.staff.phone,
              department: row.staff.department?.name ?? null,
              designation: row.staff.designation?.name ?? null,
            }
          : null,
        student: row.student
          ? {
              id: row.student.id,
              admissionNo: row.student.admissionNo,
              name: [row.student.firstName, row.student.lastName]
                .filter(Boolean)
                .join(" "),
              mobile: row.student.mobile,
              class: row.student.enrollments[0]?.class.name ?? null,
              fatherName: null,
            }
          : null,
        guardian: row.guardian
          ? {
              id: row.guardian.id,
              name: row.guardian.name,
              phone: row.guardian.phone,
            }
          : null,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "users", "edit");
    const body = createSchema.parse(await readJson(request));
    const actorType =
      body.actorType ??
      (body.tab ? PORTAL_ACTOR[body.tab] : undefined) ??
      ActorType.STAFF;
    let guardianId: string | null = null;
    if (body.guardianId) {
      const guardian = await prisma.guardian.findFirst({
        where: {
          id: body.guardianId,
          links: { some: { student: { campusId: user.campusId } } },
        },
      });
      if (!guardian) throw notFound("guardian");
      guardianId = guardian.id;
    }
    const passwordHash = await randomPasswordHash();
    const createdUser = await prisma.user.create({
      data: {
        campusId: user.campusId,
        actorType,
        username: body.username,
        email: body.email,
        passwordHash,
        isActive: true,
      },
    });
    if (body.roleIds?.length) {
      const roles = await prisma.role.findMany({
        where: {
          id: { in: body.roleIds },
          OR: [{ campusId: user.campusId }, { campusId: null }],
        },
      });
      if (roles.length) {
        await prisma.userRole.createMany({
          data: roles.map((role) => ({
            userId: createdUser.id,
            roleId: role.id,
          })),
        });
      }
    }
    if (body.staffId) {
      await prisma.staff.updateMany({
        where: { id: body.staffId, campusId: user.campusId },
        data: { userId: createdUser.id },
      });
    }
    if (body.studentId) {
      await prisma.student.updateMany({
        where: { id: body.studentId, campusId: user.campusId },
        data: { userId: createdUser.id },
      });
    }
    if (guardianId) {
      await prisma.guardian.update({
        where: { id: guardianId },
        data: { userId: createdUser.id },
      });
    }
    const inviteToken = await issuePasswordReset(createdUser.id);
    return created({
      id: createdUser.id,
      username: createdUser.username,
      inviteToken,
    });
  } catch (error) {
    return fail(error);
  }
}
