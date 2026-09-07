import { InvoiceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
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
  const existing = await prisma.studentTransport.findUnique({
    where: { studentId: student.id },
  });
  const row = existing
    ? await prisma.studentTransport.update({
        where: { studentId: student.id },
        data: { routeId: route.id, pickupPointId: pickup.id },
      })
    : await prisma.studentTransport.create({
        data: {
          studentId: student.id,
          routeId: route.id,
          pickupPointId: pickup.id,
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
