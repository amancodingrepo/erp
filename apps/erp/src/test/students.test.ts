import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as categoriesPost } from "@/app/api/v1/categories/route";
import { POST as classesPost } from "@/app/api/v1/classes/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import { POST as disableReasonsPost } from "@/app/api/v1/disable-reasons/route";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { POST as disableStudent } from "@/app/api/v1/students/[id]/disable/route";
import {
  GET as documentsGet,
  POST as documentsPost,
} from "@/app/api/v1/students/[id]/documents/route";
import { GET as studentGet } from "@/app/api/v1/students/[id]/route";
import { POST as importPost } from "@/app/api/v1/students/import/route";
import { POST as rollPost } from "@/app/api/v1/students/roll-numbers/route";
import { GET as studentsGet, POST as studentsPost } from "@/app/api/v1/students/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `t3-${Date.now()}`;

function req(method: string, path: string, token: string, payload?: unknown) {
  return new Request(`http://local${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(payload !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("Task 3 students SIS", () => {
  let token: string;
  let campusId: string;
  let sessionId: string;
  let classId: string;
  let sectionId: string;
  let className: string;
  let categoryId: string;
  let reasonId: string;
  let studentId: string;
  const admissionNo = `ADM-${suffix}`;

  beforeAll(async () => {
    const loginRes = await loginPost(
      new Request("http://local/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "admin",
          password: SEED_PASSWORD,
          portal: "staff",
        }),
      }),
    );
    const loginBody = (await loginRes.json()) as {
      token?: string;
      user?: { campusId: string };
    };
    if (!loginBody.token) throw new Error(`login failed: ${loginRes.status}`);
    token = loginBody.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus) throw new Error("seed campus missing");
    campusId = campus.id;
    sessionId = campus.currentSessionId ?? "";

    const dept = await json(
      await departmentsPost(
        req("POST", "/api/v1/departments", token, {
          name: `Arts ${suffix}`,
          code: `ART-${suffix}`,
        }),
      ),
    );
    const program = await json(
      await programsPost(
        req("POST", "/api/v1/programs", token, {
          departmentId: (dept.body as { id: string }).id,
          name: `BA ${suffix}`,
          level: "UNDERGRADUATE",
        }),
      ),
    );
    className = `FY ${suffix}`;
    const klass = await json(
      await classesPost(
        req("POST", "/api/v1/classes", token, {
          programId: (program.body as { id: string }).id,
          name: className,
          yearNo: 1,
          sectionNames: ["A"],
        }),
      ),
    );
    classId = (klass.body as { id: string }).id;
    sectionId = (klass.body as { sections: { id: string }[] }).sections[0].id;

    const cat = await json(
      await categoriesPost(
        req("POST", "/api/v1/categories", token, {
          name: `OBC ${suffix}`,
          code: `OBC-${suffix}`,
        }),
      ),
    );
    expect(cat.status).toBe(201);
    categoryId = (cat.body as { id: string }).id;

    const reason = await json(
      await disableReasonsPost(
        req("POST", "/api/v1/disable-reasons", token, {
          name: `Left ${suffix}`,
        }),
      ),
    );
    expect(reason.status).toBe(201);
    reasonId = (reason.body as { id: string }).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a student with unique admissionNo and live list columns", async () => {
    const created = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo,
          firstName: "Kavya",
          lastName: "Sharma",
          gender: "FEMALE",
          dob: "2006-04-15",
          mobile: "9876500001",
          email: `kavya-${suffix}@college.local`,
          aadhaar: "123412341234",
          pan: "ABCDE1234F",
          categoryId,
          classId,
          sectionId,
          sessionId,
          addresses: {
            permanent: {
              line1: "12 MG Road",
              city: "Indore",
              state: "MP",
              pincode: "452001",
              nation: "India",
            },
            localSameAsPermanent: true,
          },
          previousEdu: {
            qualification: "12th",
            university: "MP Board",
            marksObtained: 420,
            marksTotal: 500,
          },
          bank: {
            accountNo: "12345678901",
            holderName: "Kavya Sharma",
            bankName: "SBI",
            ifsc: "SBIN0001234",
          },
          guardians: {
            father: { name: "Ramesh Sharma", phone: "9000000001" },
            mother: { name: "Sita Sharma" },
          },
        }),
      ),
    );
    expect(created.status).toBe(201);
    studentId = (created.body as { id: string }).id;
    expect(studentId).toBeTruthy();

    const stored = await prisma.student.findUnique({ where: { id: studentId } });
    expect(stored?.aadhaarEnc).toMatch(/^v1:/);
    expect(stored?.aadhaarEnc).not.toContain("123412341234");

    const list = await json(
      await studentsGet(
        req("GET", `/api/v1/students?q=${admissionNo}`, token),
      ),
    );
    expect(list.status).toBe(200);
    const rows = (list.body as { data: Array<Record<string, unknown>> }).data;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      admissionNo,
      name: "Kavya Sharma",
      class: className,
      enrollmentNo: null,
      fatherName: "Ramesh Sharma",
      gender: "FEMALE",
      category: `OBC ${suffix}`,
      mobile: "9876500001",
    });
    expect(rows[0]).toHaveProperty("rollNo");
    expect(rows[0]).toHaveProperty("dob");
  });

  it("rejects duplicate admissionNo with 409", async () => {
    const dup = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo,
          firstName: "Other",
        }),
      ),
    );
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe("conflict");
  });

  it("searches by name fragment and admissionNo", async () => {
    const byName = await json(
      await studentsGet(req("GET", `/api/v1/students?q=Kavya`, token)),
    );
    const rows = (byName.body as { data: Array<{ admissionNo: string }> }).data;
    expect(rows.some((r) => r.admissionNo === admissionNo)).toBe(true);

    const byId = await json(
      await studentsGet(req("GET", `/api/v1/students?q=${admissionNo}`, token)),
    );
    expect(
      (byId.body as { data: Array<{ admissionNo: string }> }).data,
    ).toHaveLength(1);
  });

  it("360 includes enrollments, invoices, attendance, and withheld marks", async () => {
    await prisma.feeInvoice.create({
      data: {
        studentId,
        sessionId,
        status: "DUE",
        total: 22000,
        paid: 0,
      },
    });
    await prisma.studentAttendance.create({
      data: {
        studentId,
        date: new Date("2026-01-15T00:00:00.000Z"),
        status: "PRESENT",
      },
    });
    const group = await prisma.examGroup.create({
      data: {
        campusId,
        sessionId,
        name: `Regular ${suffix}`,
        examType: "COLLEGE_GRADE",
        groupKind: "Regular",
        exams: {
          create: {
            name: "Term 1",
            subjects: {
              create: {
                subjectId: (
                  await prisma.subject.create({
                    data: {
                      campusId,
                      name: `Physics ${suffix}`,
                      code: `PHY-${suffix}`,
                    },
                  })
                ).id,
                maxMarks: 100,
                minMarks: 40,
              },
            },
          },
        },
      },
      include: { exams: { include: { subjects: true } } },
    });
    await prisma.examMark.create({
      data: {
        examSubjectId: group.exams[0].subjects[0].id,
        studentId,
        marks: 88,
        isBlocked: true,
      },
    });

    const profile = await json(
      await studentGet(req("GET", `/api/v1/students/${studentId}`, token), {
        params: Promise.resolve({ id: studentId }),
      }),
    );
    expect(profile.status).toBe(200);
    const body = profile.body as {
      enrollments: unknown[];
      invoicesSummary: { count: number; total: number };
      attendance: unknown[];
      exams: { withheld: boolean; marks: Array<{ status: string; marks: unknown }> };
      aadhaarMasked: string | null;
    };
    expect(body.enrollments.length).toBeGreaterThan(0);
    expect(body.invoicesSummary.count).toBeGreaterThanOrEqual(1);
    expect(Number(body.invoicesSummary.total)).toBe(22000);
    expect(body.attendance.length).toBeGreaterThanOrEqual(1);
    expect(body.exams.withheld).toBe(true);
    expect(body.exams.marks[0].status).toBe("withheld");
    expect(body.exams.marks[0].marks).toBeNull();
    expect(body.aadhaarMasked).toMatch(/1234$/);
    expect(profile.body).not.toHaveProperty("aadhaarEnc");
  });

  it("disables with reason and hides from default search", async () => {
    const disabled = await json(
      await disableStudent(
        req("POST", `/api/v1/students/${studentId}/disable`, token, {
          reasonId,
        }),
        { params: Promise.resolve({ id: studentId }) },
      ),
    );
    expect(disabled.status).toBe(200);

    const missingReason = await json(
      await disableStudent(
        req("POST", `/api/v1/students/${studentId}/disable`, token, {}),
        { params: Promise.resolve({ id: studentId }) },
      ),
    );
    expect(missingReason.status).toBe(422);

    const active = await json(
      await studentsGet(req("GET", `/api/v1/students?q=${admissionNo}`, token)),
    );
    expect((active.body as { data: unknown[] }).data).toHaveLength(0);

    const disabledList = await json(
      await studentsGet(
        req("GET", `/api/v1/students?q=${admissionNo}&status=DISABLED`, token),
      ),
    );
    expect((disabledList.body as { data: unknown[] }).data).toHaveLength(1);
  });

  it("generates roll numbers boys-first from 101", async () => {
    const boyLast = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `B-Z-${suffix}`,
          firstName: "Arjun",
          lastName: "Zala",
          gender: "MALE",
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
    const girl = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `G-A-${suffix}`,
          firstName: "Meera",
          lastName: "Amin",
          gender: "FEMALE",
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
    const boyFirst = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `B-B-${suffix}`,
          firstName: "Dev",
          lastName: "Bhatt",
          gender: "MALE",
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
    expect(boyLast.status).toBe(201);
    expect(girl.status).toBe(201);
    expect(boyFirst.status).toBe(201);

    const rolls = await json(
      await rollPost(
        req("POST", "/api/v1/students/roll-numbers", token, {
          classId,
          sectionId,
          startFrom: 101,
          arrangement: "boys_first",
          sort: "last",
        }),
      ),
    );
    expect(rolls.status).toBe(200);
    const byId = new Map(
      (
        rolls.body as { rolls: Array<{ studentId: string; rollNo: string }> }
      ).rolls.map((r) => [r.studentId, r.rollNo]),
    );
    expect(byId.get((boyFirst.body as { id: string }).id)).toBe("101");
    expect(byId.get((boyLast.body as { id: string }).id)).toBe("102");
    expect(byId.get((girl.body as { id: string }).id)).toBe("103");
  });

  it("CSV import rolls back when any row is bad", async () => {
    const csv = [
      "Student ID,Salutation,Full Name (12th),First Name,Middle,Last,Roll,Class,Section,Enrollment No,DOB,Birth Place,Email,Qualification,Mobile,Phone,Gender,Category",
      `CSV-OK-${suffix},Mr,Good Student,Good,,Student,1,${className},A,EN1,2005-01-01,Indore,good-${suffix}@college.local,12th,9000000002,,MALE,OBC ${suffix}`,
      `CSV-BAD-${suffix},Mr,Bad Student,, ,Student,2,${className},A,EN2,2005-01-01,Indore,bad-${suffix}@college.local,12th,9000000003,,MALE,OBC ${suffix}`,
    ].join("\n");
    const form = new FormData();
    form.append(
      "file",
      new File([csv], "students.csv", { type: "text/csv" }),
    );
    const res = await importPost(
      new Request("http://local/api/v1/students/import", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      }),
    );
    const body = (await res.json()) as {
      error?: string;
      errors?: Array<{ line: number; fields: Record<string, string> }>;
    };
    expect(res.status).toBe(422);
    expect(body.error).toBe("validation_error");
    expect(body.errors?.[0]?.line).toBe(3);
    expect(body.errors?.[0]?.fields).toHaveProperty("firstName");

    const leaked = await prisma.student.findFirst({
      where: { campusId, admissionNo: `CSV-OK-${suffix}` },
    });
    expect(leaked).toBeNull();
  });

  it("uploads an allowlisted document and rejects double extensions", async () => {
    const okForm = new FormData();
    okForm.append("title", "Aadhaar");
    okForm.append(
      "file",
      new File(["%PDF-1.4 test"], "aadhaar.pdf", { type: "application/pdf" }),
    );
    const saved = await json(
      await documentsPost(
        new Request(`http://local/api/v1/students/${studentId}/documents`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: okForm,
        }),
        { params: Promise.resolve({ id: studentId }) },
      ),
    );
    expect(saved.status).toBe(201);
    expect((saved.body as { fileUrl: string }).fileUrl).toContain(
      `/students/${studentId}/`,
    );

    const listed = await json(
      await documentsGet(
        req("GET", `/api/v1/students/${studentId}/documents`, token),
        { params: Promise.resolve({ id: studentId }) },
      ),
    );
    expect(
      (listed.body as { data: unknown[] }).data.length,
    ).toBeGreaterThanOrEqual(1);

    const bad = new FormData();
    bad.append("title", "Nope");
    bad.append(
      "file",
      new File(["%PDF-1.4"], "aadhaar.pdf.exe", { type: "application/pdf" }),
    );
    const rejected = await json(
      await documentsPost(
        new Request(`http://local/api/v1/students/${studentId}/documents`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: bad,
        }),
        { params: Promise.resolve({ id: studentId }) },
      ),
    );
    expect(rejected.status).toBe(422);
  });
});
