import { prisma } from "@/lib/db";
import { conflict, notFound, validationError } from "@/lib/errors";
import { parseDateOnly } from "@/lib/campus";
import { submitApplication } from "@/lib/services/applications";

export async function listEnquiries(campusId: string, status?: string) {
  return prisma.enquiry.findMany({
    where: { campusId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function createEnquiry(
  campusId: string,
  input: {
    name: string;
    phone?: string;
    email?: string;
    source?: string;
    classInterested?: string;
    followUpOn?: string;
    remarks?: string;
  },
) {
  return prisma.enquiry.create({
    data: {
      campusId,
      name: input.name.trim(),
      phone: input.phone,
      email: input.email,
      source: input.source,
      classInterested: input.classInterested,
      followUpOn: input.followUpOn ? parseDateOnly(input.followUpOn) : undefined,
      remarks: input.remarks,
      status: "UNASSIGNED",
    },
  });
}

export async function updateEnquiryStatus(
  campusId: string,
  id: string,
  status: "UNASSIGNED" | "ASSIGNED" | "WON" | "LOST",
  assignedTo?: string,
) {
  const row = await prisma.enquiry.findFirst({ where: { id, campusId } });
  if (!row) throw notFound("enquiry");
  return prisma.enquiry.update({
    where: { id },
    data: { status, assignedTo: assignedTo ?? row.assignedTo },
  });
}

export async function convertEnquiryToApplication(campusId: string, id: string) {
  const row = await prisma.enquiry.findFirst({ where: { id, campusId } });
  if (!row) throw notFound("enquiry");
  if (row.applicationId) throw conflict("already converted");
  const parts = row.name.trim().split(/\s+/);
  const application = await submitApplication(campusId, {
    firstName: parts[0] ?? row.name,
    lastName: parts.slice(1).join(" ") || undefined,
    mobile: row.phone ?? undefined,
    email: row.email ?? undefined,
  });
  const updated = await prisma.enquiry.update({
    where: { id },
    data: { status: "WON", applicationId: application.id },
  });
  return { enquiry: updated, applicationNo: application.applicationNo };
}

export async function listVisitors(campusId: string) {
  return prisma.visitor.findMany({
    where: { campusId },
    orderBy: { inAt: "desc" },
    take: 200,
  });
}

export async function checkInVisitor(
  campusId: string,
  input: { name: string; phone?: string; purpose?: string; toMeet?: string; note?: string },
) {
  return prisma.visitor.create({
    data: {
      campusId,
      name: input.name.trim(),
      phone: input.phone,
      purpose: input.purpose,
      toMeet: input.toMeet,
      note: input.note,
    },
  });
}

export async function checkOutVisitor(campusId: string, id: string) {
  const row = await prisma.visitor.findFirst({ where: { id, campusId } });
  if (!row) throw notFound("visitor");
  if (row.outAt) throw validationError({ outAt: "already checked out" });
  return prisma.visitor.update({
    where: { id },
    data: { outAt: new Date() },
  });
}

export async function listFrontOfficeTypes(campusId: string, kind?: string) {
  return prisma.frontOfficeType.findMany({
    where: { campusId, ...(kind ? { kind } : {}) },
    orderBy: { name: "asc" },
  });
}

export async function addFrontOfficeType(
  campusId: string,
  input: { kind: string; name: string },
) {
  return prisma.frontOfficeType.create({
    data: { campusId, kind: input.kind, name: input.name.trim() },
  });
}
