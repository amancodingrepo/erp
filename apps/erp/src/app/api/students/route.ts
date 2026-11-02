import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { createStudent, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const rows = await prisma.student.findMany({
      where: { campusId: user.campusId },
      include: {
        enrollments: {
          where: { isCurrent: true },
          include: { class: true, section: true, session: true },
          take: 1,
        },
        guardians: { include: { guardian: true } },
        house: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
    });
    const students = rows.map((student) => {
      const enrollment = student.enrollments[0];
      const father = student.guardians.find((link) => link.relation === "father")?.guardian;
      const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
      return {
        id: student.admissionNo,
        studentId: student.admissionNo,
        studentCode: student.admissionNo,
        name,
        fullName: name,
        className: enrollment?.class.name ?? "",
        class: enrollment?.class.name ?? "",
        section: enrollment?.section.name ?? "",
        academicYear: enrollment?.session.name ?? "",
        rollNumber: enrollment?.rollNo ?? student.rollNo ?? "",
        enrollmentNumber: student.enrollmentNo ?? "",
        gender: student.gender ?? "",
        dob: student.dob,
        phone: student.mobile ?? "",
        email: student.email ?? "",
        father: father?.name ?? "",
        fatherName: father?.name ?? "",
        motherName: student.motherName ?? "",
        status: student.status === "ACTIVE" ? "Active" : "Inactive",
        house: student.house?.name ?? "",
        bloodGroup: student.bloodGroup ?? "",
        feeDefaulter: student.feeDefaulter,
        metadata: { erpStudentId: student.id },
      };
    });
    return ok({ students });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStaff(request);
    const body = await readJson<Record<string, unknown>>(request);
    const result = await createStudent(user.campusId, body);
    return created({ student: result.student });
  } catch (error) {
    return fail(error);
  }
}
