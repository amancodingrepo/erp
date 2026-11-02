import { Gender, StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { assertCampusStaff } from "@/lib/school-world-shape";

const GENDERS: Record<string, Gender> = {
  male: Gender.MALE,
  female: Gender.FEMALE,
  other: Gender.OTHER,
};

async function loadStudent(campusId: string, studentCode: string) {
  const student = await prisma.student.findFirst({
    where: { campusId, admissionNo: studentCode },
    include: {
      enrollments: { where: { isCurrent: true }, include: { class: true, section: true, session: true }, take: 1 },
      guardians: { include: { guardian: true } },
    },
  });
  if (!student) throw notFound("Student");
  const enrollment = student.enrollments[0];
  const father = student.guardians.find((link) => link.relation === "father")?.guardian;
  const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
  return {
    student,
    view: {
      id: student.admissionNo,
      studentId: student.admissionNo,
      studentCode: student.admissionNo,
      name,
      fullName: name,
      className: enrollment?.class.name ?? "",
      section: enrollment?.section.name ?? "",
      academicYear: enrollment?.session.name ?? "",
      rollNumber: enrollment?.rollNo ?? student.rollNo ?? "",
      phone: student.mobile ?? "",
      email: student.email ?? "",
      fatherName: father?.name ?? "",
      motherName: student.motherName ?? "",
      status: student.status === "ACTIVE" ? "Active" : "Inactive",
      house: student.house ?? "",
      bloodGroup: student.bloodGroup ?? "",
      metadata: { erpStudentId: student.id },
    },
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ studentCode: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    const { studentCode } = await context.params;
    const loaded = await loadStudent(user.campusId, decodeURIComponent(studentCode));
    return ok({ student: loaded.view });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ studentCode: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    assertCampusStaff(user);
    const { studentCode } = await context.params;
    const loaded = await loadStudent(user.campusId, decodeURIComponent(studentCode));
    const body = await readJson<Record<string, unknown>>(request);
    const data: {
      firstName?: string;
      lastName?: string;
      mobile?: string;
      email?: string;
      house?: string;
      bloodGroup?: string;
      motherName?: string;
      rollNo?: string;
      status?: StudentStatus;
      gender?: Gender;
      feeDefaulter?: boolean;
    } = {};
    if (typeof body.name === "string" && body.name.trim()) {
      const parts = body.name.trim().split(/\s+/);
      data.firstName = parts.shift() || loaded.student.firstName;
      data.lastName = parts.join(" ");
    }
    if (typeof body.phone === "string") data.mobile = body.phone;
    if (typeof body.email === "string") data.email = body.email;
    if (typeof body.house === "string") data.house = body.house;
    if (typeof body.bloodGroup === "string") data.bloodGroup = body.bloodGroup;
    if (typeof body.motherName === "string") data.motherName = body.motherName;
    if (typeof body.rollNumber === "string") data.rollNo = body.rollNumber;
    if (typeof body.feeDefaulter === "boolean") data.feeDefaulter = body.feeDefaulter;
    if (typeof body.status === "string") {
      data.status = body.status.toLowerCase() === "active" ? StudentStatus.ACTIVE : StudentStatus.DISABLED;
    }
    if (typeof body.gender === "string") {
      const gender = GENDERS[body.gender.toLowerCase()];
      if (!gender) throw new HttpError(400, "validation_error", "Gender must be Male, Female, or Other.");
      data.gender = gender;
    }
    await prisma.student.update({ where: { id: loaded.student.id }, data });
    if (typeof body.rollNumber === "string" && loaded.student.enrollments[0]) {
      await prisma.studentEnrollment.update({
        where: { id: loaded.student.enrollments[0].id },
        data: { rollNo: body.rollNumber },
      });
    }
    const fresh = await loadStudent(user.campusId, loaded.student.admissionNo);
    return ok({ student: fresh.view });
  } catch (error) {
    return fail(error);
  }
}
