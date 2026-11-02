import { ActorType, Gender, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { issuePasswordReset } from "@/lib/password-reset";
import { newTemporaryPassword } from "@/lib/services/campus-user-passwords";
import { requireApiPermission } from "@/lib/principal";
import {
  parseStaffCreatePassword,
  staffCreateNeedsLogin,
  staffLoginUsername,
  toStaffLogin,
} from "@/lib/services/campus-staff-login";
import {
  assignStaffRole,
  attachStaffExtras,
  listStaffExtras,
  writeStaffExtra,
} from "@/lib/services/hr-transport";
import {
  attachStaffModules,
  listStaffModules,
  saveStaffModules,
} from "@/lib/services/campus-staff-modules";
import {
  attachStaffAssignments,
  listStaffClasses,
  listStaffSubjects,
  saveStaffClasses,
  saveStaffSubjects,
} from "@/lib/services/campus-staff-assignments";
import {
  attachStaffDocuments,
  listStaffDocuments,
} from "@/lib/services/campus-staff-docs";

const createSchema = z.object({
  employeeId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  joiningDate: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  roleId: z.string().optional(),
  category: z.string().optional(),
  licenseNo: z.string().optional(),
  licenseExpiry: z.string().optional(),
  modules: z.array(z.string()).optional(),
  classIds: z.array(z.string()).optional(),
  subjectIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim();
    const departmentId = params.get("departmentId") ?? undefined;
    const status = (params.get("status") ?? "active").toLowerCase();
    const data = await prisma.staff.findMany({
      where: {
        campusId: user.campusId,
        ...(departmentId ? { departmentId } : {}),
        ...(status === "inactive" || status === "disabled"
          ? { isActive: false }
          : status === "all"
            ? {}
            : { isActive: true }),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { employeeId: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
                { user: { username: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        department: true,
        designation: true,
        user: { include: { roles: { include: { role: true } } } },
      },
      orderBy: { firstName: "asc" },
    });
    const extras = await listStaffExtras(user.campusId);
    const modules = await listStaffModules(user.campusId);
    const [classRows, subjectRows, documents] = await Promise.all([
      listStaffClasses(user.campusId),
      listStaffSubjects(user.campusId),
      listStaffDocuments(user.campusId),
    ]);
    return ok({
      data: attachStaffDocuments(
        attachStaffAssignments(
          attachStaffModules(attachStaffExtras(data, extras), modules),
          classRows,
          subjectRows,
        ),
        documents,
      ).map((row) => ({
        ...row,
        login: toStaffLogin(row.user),
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "create");
    const body = createSchema.parse(await readJson(request));
    try {
      const needsLogin = staffCreateNeedsLogin(body);
      const parsedPassword = parseStaffCreatePassword(body.password);
      const temporaryPassword =
        needsLogin && !parsedPassword.set ? newTemporaryPassword() : undefined;
      const row = await prisma.$transaction(async (tx) => {
        let userId: string | undefined;
        if (needsLogin) {
          const account = await tx.user.create({
            data: {
              campusId: user.campusId,
              actorType: ActorType.STAFF,
              username: staffLoginUsername({
                username: body.username,
                phone: body.phone,
                employeeId: body.employeeId,
              }),
              email: body.email,
              passwordHash: parsedPassword.set
                ? await hashPassword(parsedPassword.password)
                : await hashPassword(temporaryPassword!),
              isActive: true,
            },
          });
          userId = account.id;
        }
        return tx.staff.create({
          data: {
            campusId: user.campusId,
            employeeId: body.employeeId.trim(),
            firstName: body.firstName.trim(),
            lastName: body.lastName,
            email: body.email,
            phone: body.phone,
            gender: body.gender,
            departmentId: body.departmentId,
            designationId: body.designationId,
            joiningDate: body.joiningDate ? new Date(body.joiningDate) : undefined,
            userId,
          },
          include: {
            department: true,
            designation: true,
            user: { include: { roles: { include: { role: true } } } },
          },
        });
      });
      let inviteToken: string | undefined;
      if (row.userId && !parsedPassword.set) {
        inviteToken = await issuePasswordReset(row.userId);
      }
      if (body.roleId && row.id) {
        await assignStaffRole(user.campusId, row.id, body.roleId);
      }
      const extra =
        body.category || body.licenseNo || body.licenseExpiry
          ? await writeStaffExtra(user.campusId, row.id, {
              category: body.category,
              licenseNo: body.licenseNo,
              licenseExpiry: body.licenseExpiry,
            })
          : null;
      const modules = body.modules
        ? (await saveStaffModules(user.campusId, row.id, body.modules)).modules
        : [];
      const classIds = body.classIds
        ? (await saveStaffClasses(user.campusId, row.id, body.classIds)).classIds
        : [];
      const subjectIds = body.subjectIds
        ? (await saveStaffSubjects(user.campusId, row.id, body.subjectIds)).subjectIds
        : [];
      const withLogin = await prisma.staff.findUnique({
        where: { id: row.id },
        include: {
          user: { include: { roles: { include: { role: true } } } },
        },
      });
      return created({
        ...row,
        extra,
        modules,
        classIds,
        subjectIds,
        inviteToken,
        temporaryPassword,
        login: toStaffLogin(withLogin?.user),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw conflict("duplicate employeeId");
      }
      throw error;
    }
  } catch (error) {
    return fail(error);
  }
}
