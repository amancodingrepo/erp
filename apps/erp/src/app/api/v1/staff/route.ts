import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  employeeId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
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
      include: { department: true, designation: true },
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
    const row = await prisma.staff.create({
      data: {
        campusId: user.campusId,
        employeeId: body.employeeId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        departmentId: body.departmentId,
      },
    });
    return created(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail(error);
    }
    return fail(error);
  }
}
