import { ActorType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { issuePasswordReset, randomPasswordHash } from "@/lib/password-reset";
import { saveStaffCategory } from "@/lib/services/campus-staff-categories";
import {
  attachStaffExtras,
  listStaffExtras,
  listVehicleExtras,
  saveStaffExtras,
  writeStaffExtra,
  type StaffExtra,
} from "@/lib/services/hr-transport";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function isDriverExtra(extra: { category?: string; licenseNo?: string } | null) {
  if (!extra) return false;
  const category = String(extra.category ?? "").toLowerCase();
  if (category.includes("driver")) return true;
  return Boolean(String(extra.licenseNo ?? "").trim());
}

export function parseDriverWrite(input: unknown) {
  if (!input || typeof input !== "object") {
    throw validationError({ driver: "required" });
  }
  const rec = input as Record<string, unknown>;
  const employeeId = trim(rec.employeeId);
  const firstName = trim(rec.firstName);
  const licenseNo = trim(rec.licenseNo);
  if (!employeeId) throw validationError({ employeeId: "required" });
  if (!firstName) throw validationError({ firstName: "required" });
  if (!licenseNo) throw validationError({ licenseNo: "required" });
  const lastName = trim(rec.lastName);
  const phone = trim(rec.phone);
  const email = trim(rec.email);
  const username = trim(rec.username);
  const licenseExpiry = trim(rec.licenseExpiry);
  return {
    employeeId,
    firstName,
    lastName: lastName || undefined,
    phone: phone || undefined,
    email: email || undefined,
    username: username || undefined,
    licenseNo,
    licenseExpiry: licenseExpiry || undefined,
  };
}

export function driverAssignedToVehicle(
  extras: Array<{ driverId: string }>,
  staffId: string,
) {
  const key = trim(staffId);
  return extras.some((row) => row.driverId === key);
}

export function dropDriverExtra(rows: StaffExtra[], staffId: string) {
  const key = trim(staffId);
  return rows.map((row) => {
    if (row.staffId !== key) return row;
    const category = row.category.toLowerCase().includes("driver")
      ? ""
      : row.category;
    return { ...row, category, licenseNo: "", licenseExpiry: "" };
  });
}

export async function listDrivers(campusId: string) {
  const extras = await listStaffExtras(campusId);
  const driverIds = extras.filter((row) => isDriverExtra(row)).map((row) => row.staffId);
  if (!driverIds.length) return { data: [] as Array<Record<string, unknown>> };
  const staff = await prisma.staff.findMany({
    where: { campusId, id: { in: driverIds } },
    include: { department: true, designation: true, user: true },
    orderBy: { firstName: "asc" },
  });
  return { data: attachStaffExtras(staff, extras) };
}

export async function createDriver(campusId: string, input: unknown) {
  const body = parseDriverWrite(input);
  await saveStaffCategory(campusId, { name: "Driver" });
  try {
    const row = await prisma.$transaction(async (tx) => {
      let userId: string | undefined;
      if (body.username) {
        const account = await tx.user.create({
          data: {
            campusId,
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
          campusId,
          employeeId: body.employeeId,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone,
          userId,
        },
        include: { department: true, designation: true, user: true },
      });
    });
    const extra = await writeStaffExtra(campusId, row.id, {
      category: "Driver",
      licenseNo: body.licenseNo,
      licenseExpiry: body.licenseExpiry,
    });
    let inviteToken: string | undefined;
    if (row.userId) {
      inviteToken = await issuePasswordReset(row.userId);
    }
    return { ...row, extra, inviteToken };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("duplicate employeeId");
    }
    throw error;
  }
}

export async function getDriver(campusId: string, id: string) {
  const extras = await listStaffExtras(campusId);
  const extra = extras.find((row) => row.staffId === trim(id)) ?? null;
  if (!isDriverExtra(extra)) throw notFound("driver");
  const staff = await prisma.staff.findFirst({
    where: { campusId, id: trim(id) },
    include: { department: true, designation: true, user: true },
  });
  if (!staff) throw notFound("driver");
  return attachStaffExtras([staff], extras)[0]!;
}

export async function patchDriver(
  campusId: string,
  id: string,
  patch: {
    employeeId?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    licenseNo?: string;
    licenseExpiry?: string;
  },
) {
  const existing = await getDriver(campusId, id);
  const employeeId = trim(patch.employeeId ?? existing.employeeId);
  const firstName = trim(patch.firstName ?? existing.firstName);
  if (!employeeId) throw validationError({ employeeId: "required" });
  if (!firstName) throw validationError({ firstName: "required" });
  try {
    await prisma.staff.update({
      where: { id: existing.id },
      data: {
        employeeId,
        firstName,
        ...(patch.lastName !== undefined ? { lastName: trim(patch.lastName) || null } : {}),
        ...(patch.phone !== undefined ? { phone: trim(patch.phone) || null } : {}),
        ...(patch.email !== undefined ? { email: trim(patch.email) || null } : {}),
      },
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
  if (patch.licenseNo !== undefined || patch.licenseExpiry !== undefined) {
    await writeStaffExtra(campusId, existing.id, {
      ...(patch.licenseNo !== undefined ? { licenseNo: trim(patch.licenseNo) } : {}),
      ...(patch.licenseExpiry !== undefined
        ? { licenseExpiry: trim(patch.licenseExpiry) }
        : {}),
    });
  }
  return getDriver(campusId, existing.id);
}

export async function removeDriver(campusId: string, id: string) {
  const existing = await getDriver(campusId, id);
  if (driverAssignedToVehicle(await listVehicleExtras(campusId), existing.id)) {
    throw conflict("driver assigned to a vehicle");
  }
  await saveStaffExtras(
    campusId,
    dropDriverExtra(await listStaffExtras(campusId), existing.id),
  );
  return { id: existing.id, deleted: true };
}
