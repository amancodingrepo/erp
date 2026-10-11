import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
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

const patchSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  departmentId: z.string().nullable().optional(),
  designationId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  category: z.string().optional(),
  licenseNo: z.string().optional(),
  licenseExpiry: z.string().optional(),
  roleId: z.string().optional(),
  modules: z.array(z.string()).optional(),
  classIds: z.array(z.string()).optional(),
  subjectIds: z.array(z.string()).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const { id } = await context.params;
    const staff = await prisma.staff.findFirst({
      where: { id, campusId: user.campusId },
      include: { department: true, designation: true, user: true },
    });
    if (!staff) throw notFound("staff");
    const extras = await listStaffExtras(user.campusId);
    const modules = await listStaffModules(user.campusId);
    const [classRows, subjectRows, documents] = await Promise.all([
      listStaffClasses(user.campusId),
      listStaffSubjects(user.campusId),
      listStaffDocuments(user.campusId),
    ]);
    return ok(
      attachStaffDocuments(
        attachStaffAssignments(
          attachStaffModules(attachStaffExtras([staff], extras), modules),
          classRows,
          subjectRows,
        ),
        documents,
      )[0],
    );
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "edit");
    const { id } = await context.params;
    const existing = await prisma.staff.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("staff");
    const body = patchSchema.parse(await readJson(request));
    const {
      category,
      licenseNo,
      licenseExpiry,
      roleId,
      modules,
      classIds,
      subjectIds,
      ...fields
    } = body;
    const staff = await prisma.staff.update({
      where: { id },
      data: fields,
    });
    const extra =
      category !== undefined ||
      licenseNo !== undefined ||
      licenseExpiry !== undefined
        ? await writeStaffExtra(user.campusId, id, {
            category,
            licenseNo,
            licenseExpiry,
          })
        : (await listStaffExtras(user.campusId)).find((row) => row.staffId === id) ??
          null;
    const role = roleId
      ? await assignStaffRole(user.campusId, id, roleId)
      : null;
    const moduleRow =
      modules !== undefined
        ? await saveStaffModules(user.campusId, id, modules)
        : (await listStaffModules(user.campusId)).find((row) => row.staffId === id);
    const classIdsOut =
      classIds !== undefined
        ? (await saveStaffClasses(user.campusId, id, classIds)).classIds
        : ((await listStaffClasses(user.campusId)).find((row) => row.staffId === id)
            ?.ids ?? []);
    const subjectIdsOut =
      subjectIds !== undefined
        ? (await saveStaffSubjects(user.campusId, id, subjectIds)).subjectIds
        : ((await listStaffSubjects(user.campusId)).find((row) => row.staffId === id)
            ?.ids ?? []);
    return ok({
      ...staff,
      extra,
      role,
      modules: moduleRow?.modules ?? [],
      classIds: classIdsOut,
      subjectIds: subjectIdsOut,
    });
  } catch (error) {
    return fail(error);
  }
}
