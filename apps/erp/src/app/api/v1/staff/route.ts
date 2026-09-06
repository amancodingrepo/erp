import { ActorType, Gender, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { issuePasswordReset, randomPasswordHash } from "@/lib/password-reset";
import { requireApiPermission } from "@/lib/principal";

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
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim();
    const departmentId = params.get("departmentId") ?? undefined;
    const data = await prisma.staff.findMany({
      where: {
        campusId: user.campusId,
        ...(departmentId ? { departmentId } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { employeeId: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { department: true, designation: true, user: true },
      orderBy: { firstName: "asc" },
    });
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "create");
    const body = createSchema.parse(await readJson(request));
    try {
      const row = await prisma.$transaction(async (tx) => {
        let userId: string | undefined;
        if (body.username) {
          const account = await tx.user.create({
            data: {
              campusId: user.campusId,
              actorType: ActorType.STAFF,
              username: body.username,
              email: body.email,
              passwordHash: await randomPasswordHash(),
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
          include: { department: true, designation: true, user: true },
        });
      });
      let inviteToken: string | undefined;
      if (row.userId) {
        inviteToken = await issuePasswordReset(row.userId);
      }
      return created({ ...row, inviteToken });
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
