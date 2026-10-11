import { InvoiceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, prismaErrorCode, validationError } from "@/lib/errors";
import { dec } from "@/lib/money";

async function ensureFeeType(campusId: string, name: string) {
  const existing = await prisma.feeType.findFirst({
    where: { campusId, name },
  });
  if (existing) return existing;
  return prisma.feeType.create({ data: { campusId, name } });
}

async function chargeFeeHead(input: {
  campusId: string;
  studentId: string;
  feeTypeName: string;
  amount: Prisma.Decimal;
  description: string;
}) {
  const campus = await prisma.campus.findUnique({ where: { id: input.campusId } });
  if (!campus?.currentSessionId) throw validationError({ sessionId: "session required" });
  const feeType = await ensureFeeType(input.campusId, input.feeTypeName);
  const already = await prisma.feeInvoiceLine.findFirst({
    where: {
      feeTypeId: feeType.id,
      invoice: {
        studentId: input.studentId,
        sessionId: campus.currentSessionId,
      },
    },
  });
  if (already) return already.invoiceId;
  const invoice = await prisma.feeInvoice.create({
    data: {
      studentId: input.studentId,
      sessionId: campus.currentSessionId,
      status: InvoiceStatus.DUE,
      total: input.amount,
      lines: {
        create: {
          feeTypeId: feeType.id,
          description: input.description,
          amount: input.amount,
        },
      },
    },
  });
  return invoice.id;
}

export function hostelDeleteBlocked(roomCount: number) {
  return roomCount > 0;
}

export function hostelPatchData(
  existing: { name: string },
  patch: { name?: string; feeAmount?: number | string },
) {
  const name = patch.name !== undefined ? patch.name.trim() : existing.name;
  if (!name) throw validationError({ name: "required" });
  const feeAmount =
    patch.feeAmount !== undefined ? dec(patch.feeAmount) : undefined;
  if (feeAmount !== undefined && feeAmount.lt(0)) {
    throw validationError({ feeAmount: "invalid" });
  }
  return {
    name,
    ...(feeAmount !== undefined ? { feeAmount } : {}),
  };
}

export async function getHostel(campusId: string, id: string) {
  const row = await prisma.hostel.findFirst({
    where: { id: id.trim(), campusId },
    include: { rooms: true },
  });
  if (!row) throw notFound("hostel");
  return row;
}

export async function patchHostel(
  campusId: string,
  id: string,
  patch: { name?: string; feeAmount?: number | string },
) {
  const existing = await getHostel(campusId, id);
  const data = hostelPatchData(existing, patch);
  try {
    return await prisma.hostel.update({
      where: { id: existing.id },
      data,
      include: { rooms: true },
    });
  } catch (error) {
    if (prismaErrorCode(error) === "P2002") throw conflict("duplicate name");
    throw error;
  }
}

export async function removeHostel(campusId: string, id: string) {
  const existing = await getHostel(campusId, id);
  if (hostelDeleteBlocked(existing.rooms.length)) {
    throw conflict("hostel is in use");
  }
  await prisma.hostel.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}

export async function createHostel(
  campusId: string,
  input: { name: string; feeAmount: number | string },
) {
  return prisma.hostel.create({
    data: {
      campusId,
      name: input.name.trim(),
      feeAmount: dec(input.feeAmount),
    },
  });
}

export async function createRoom(
  campusId: string,
  input: { hostelId: string; number: string; capacity: number; roomType?: string },
) {
  const hostel = await prisma.hostel.findFirst({
    where: { id: input.hostelId, campusId },
  });
  if (!hostel) throw notFound("hostel");
  if (input.capacity < 1) throw validationError({ capacity: "must be at least 1" });
  return prisma.hostelRoom.create({
    data: {
      hostelId: hostel.id,
      number: input.number.trim(),
      capacity: input.capacity,
      roomType: input.roomType ?? "2-share",
    },
  });
}

export async function vacancy(campusId: string) {
  const rooms = await prisma.hostelRoom.findMany({
    where: { hostel: { campusId } },
    include: {
      hostel: true,
      allocations: { where: { leftAt: null } },
    },
  });
  return rooms.map((room) => ({
    id: room.id,
    hostel: room.hostel.name,
    number: room.number,
    roomType: room.roomType,
    capacity: room.capacity,
    occupied: room.allocations.length,
    vacant: Math.max(0, room.capacity - room.allocations.length),
  }));
}

export async function allocateRoom(input: {
  campusId: string;
  studentId: string;
  roomId: string;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId: input.campusId },
  });
  if (!student) throw notFound("student");
  const room = await prisma.hostelRoom.findFirst({
    where: { id: input.roomId, hostel: { campusId: input.campusId } },
    include: { hostel: true, allocations: { where: { leftAt: null } } },
  });
  if (!room) throw notFound("room");
  const current = await prisma.hostelAllocation.findFirst({
    where: { studentId: student.id, leftAt: null },
  });
  if (current?.roomId === room.id) throw conflict("already in this room");
  if (room.allocations.length >= room.capacity) {
    throw validationError({ roomId: "room is full" });
  }
  const allocation = await prisma.$transaction(async (tx) => {
    if (current) {
      await tx.hostelAllocation.update({
        where: { id: current.id },
        data: { leftAt: new Date() },
      });
    }
    return tx.hostelAllocation.create({
      data: { roomId: room.id, studentId: student.id },
    });
  });
  const invoiceId = current
    ? null
    : await chargeFeeHead({
        campusId: input.campusId,
        studentId: student.id,
        feeTypeName: "Hostel",
        amount: room.hostel.feeAmount,
        description: `Hostel ${room.hostel.name} ${room.number}`,
      });
  return { allocationId: allocation.id, invoiceId, moved: Boolean(current) };
}

export async function createRoute(
  campusId: string,
  input: { name: string; feeAmount: number | string; pickups?: string[] },
) {
  return prisma.transportRoute.create({
    data: {
      campusId,
      name: input.name.trim(),
      feeAmount: dec(input.feeAmount),
      pickups: input.pickups?.length
        ? {
            create: input.pickups.map((name, i) => ({
              name: name.trim(),
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: { pickups: true },
  });
}

export async function updateRoute(
  campusId: string,
  id: string,
  input: { name?: string; feeAmount?: number | string },
) {
  const existing = await prisma.transportRoute.findFirst({
    where: { id, campusId },
  });
  if (!existing) throw notFound("route");
  return prisma.transportRoute.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.feeAmount !== undefined ? { feeAmount: dec(input.feeAmount) } : {}),
    },
    include: { pickups: { orderBy: { sortOrder: "asc" as const } } },
  });
}

export async function deleteRoute(campusId: string, id: string) {
  const existing = await prisma.transportRoute.findFirst({
    where: { id, campusId },
    include: {
      _count: { select: { riders: true, outRiders: true } },
    },
  });
  if (!existing) throw notFound("route");
  if (existing._count.riders > 0 || existing._count.outRiders > 0) {
    throw conflict("route is in use");
  }
  await prisma.$transaction(async (tx) => {
    await tx.vehicle.updateMany({
      where: { routeId: id, campusId },
      data: { routeId: null },
    });
    await tx.pickupPoint.deleteMany({ where: { routeId: id } });
    await tx.transportRoute.delete({ where: { id } });
  });
  return { id, deleted: true };
}

export async function createVehicle(
  campusId: string,
  input: { registrationNo: string; routeId?: string },
) {
  if (input.routeId) {
    const route = await prisma.transportRoute.findFirst({
      where: { id: input.routeId, campusId },
    });
    if (!route) throw notFound("route");
  }
  return prisma.vehicle.create({
    data: {
      campusId,
      registrationNo: input.registrationNo.trim(),
      routeId: input.routeId,
    },
  });
}

export async function assignTransport(input: {
  campusId: string;
  studentId: string;
  routeId: string;
  pickupPointId: string;
  outRouteId?: string;
  outPickupPointId?: string;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId: input.campusId },
  });
  if (!student) throw notFound("student");
  const route = await prisma.transportRoute.findFirst({
    where: { id: input.routeId, campusId: input.campusId },
    include: { pickups: true },
  });
  if (!route) throw notFound("route");
  const pickup = route.pickups.find((p) => p.id === input.pickupPointId);
  if (!pickup) throw validationError({ pickupPointId: "not on this route" });
  let outRouteId: string | undefined;
  let outPickupPointId: string | undefined;
  if (input.outRouteId || input.outPickupPointId) {
    if (!input.outRouteId || !input.outPickupPointId) {
      throw validationError({ outPickupPointId: "out route and stop required together" });
    }
    const outRoute = await prisma.transportRoute.findFirst({
      where: { id: input.outRouteId, campusId: input.campusId },
      include: { pickups: true },
    });
    if (!outRoute) throw notFound("out route");
    const outPickup = outRoute.pickups.find((p) => p.id === input.outPickupPointId);
    if (!outPickup) throw validationError({ outPickupPointId: "not on this route" });
    outRouteId = outRoute.id;
    outPickupPointId = outPickup.id;
  }
  const existing = await prisma.studentTransport.findUnique({
    where: { studentId: student.id },
  });
  const data = {
    routeId: route.id,
    pickupPointId: pickup.id,
    ...(outRouteId
      ? { outRouteId, outPickupPointId }
      : {}),
  };
  const row = existing
    ? await prisma.studentTransport.update({
        where: { studentId: student.id },
        data,
      })
    : await prisma.studentTransport.create({
        data: {
          studentId: student.id,
          ...data,
        },
      });
  const invoiceId = existing
    ? null
    : await chargeFeeHead({
        campusId: input.campusId,
        studentId: student.id,
        feeTypeName: "Transport",
        amount: route.feeAmount,
        description: `Transport ${route.name} / ${pickup.name}`,
      });
  return { id: row.id, invoiceId };
}
