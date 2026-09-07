import { beforeAll, describe, expect, it } from "vitest";
import { POST as categoriesPost } from "@/app/api/v1/categories/route";
import { POST as classesPost } from "@/app/api/v1/classes/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import { POST as disableReasonsPost } from "@/app/api/v1/disable-reasons/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { POST as disableStudent } from "@/app/api/v1/students/[id]/disable/route";
import { POST as importPost } from "@/app/api/v1/students/import/route";
import { POST as rollPost } from "@/app/api/v1/students/roll-numbers/route";
import { GET as studentsGet, POST as studentsPost } from "@/app/api/v1/students/route";
import { prisma } from "@/lib/db";
import { json, login, req } from "./helpers";

const suffix = `acc-stu-${Date.now()}`;

describe("acceptance Students", () => {
  let token: string;
  let sessionId: string;
  let classId: string;
  let sectionId: string;
  let className: string;
  let reasonId: string;
  let studentId: string;
  const admissionNo = `ACC-${suffix}`;

  beforeAll(async () => {
    const auth = await login("admin");
    if (!auth.token) throw new Error("login failed");
    token = auth.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    sessionId = campus.currentSessionId;
    const dept = await json(
      await departmentsPost(
        req("POST", "/api/v1/departments", token, {
          name: `Stu ${suffix}`,
          code: `STU-${suffix}`,
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
    await categoriesPost(
      req("POST", "/api/v1/categories", token, {
        name: `GEN ${suffix}`,
        code: `GEN-${suffix}`,
      }),
    );
    const reason = await json(
      await disableReasonsPost(
        req("POST", "/api/v1/disable-reasons", token, { name: `Left ${suffix}` }),
      ),
    );
    reasonId = (reason.body as { id: string }).id;
  });

  it("Create student with unique admissionNo", async () => {
    const created = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo,
          firstName: "Kavya",
          lastName: "Shah",
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
    expect(created.status).toBe(201);
    studentId = (created.body as { id: string }).id;
  });

  it("Duplicate admissionNo → 409", async () => {
    const dup = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo,
          firstName: "Other",
        }),
      ),
    );
    expect(dup.status).toBe(409);
  });

  it("Search by name fragment and by admissionNo", async () => {
    const byName = await json(
      await studentsGet(req("GET", `/api/v1/students?q=Kavya`, token)),
    );
    const rows = (byName.body as { data: Array<{ admissionNo: string }> }).data;
    expect(rows.some((r) => r.admissionNo === admissionNo)).toBe(true);
    const byId = await json(
      await studentsGet(req("GET", `/api/v1/students?q=${admissionNo}`, token)),
    );
    expect((byId.body as { data: unknown[] }).data).toHaveLength(1);
  });

  it("Disable with reason → disappears from default search, appears on disabled list", async () => {
    const disabled = await json(
      await disableStudent(
        req("POST", `/api/v1/students/${studentId}/disable`, token, {
          reasonId,
        }),
        { params: Promise.resolve({ id: studentId }) },
      ),
    );
    expect(disabled.status).toBe(200);
    const active = await json(
      await studentsGet(req("GET", `/api/v1/students?q=${admissionNo}`, token)),
    );
    expect((active.body as { data: unknown[] }).data).toHaveLength(0);
    const listed = await json(
      await studentsGet(
        req("GET", `/api/v1/students?q=${admissionNo}&status=DISABLED`, token),
      ),
    );
    expect((listed.body as { data: unknown[] }).data).toHaveLength(1);
  });

  it("Generate roll numbers boys-first from 101", async () => {
    const boy = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `B-${suffix}`,
          firstName: "Dev",
          lastName: "Bhatt",
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
          admissionNo: `G-${suffix}`,
          firstName: "Meera",
          lastName: "Amin",
          gender: "FEMALE",
          classId,
          sectionId,
          sessionId,
        }),
      ),
    );
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
      (rolls.body as { rolls: Array<{ studentId: string; rollNo: string }> }).rolls.map(
        (r) => [r.studentId, r.rollNo],
      ),
    );
    expect(byId.get((boy.body as { id: string }).id)).toBe("101");
    expect(byId.get((girl.body as { id: string }).id)).toBe("102");
  });

  it("CSV import: one bad row does not insert; error report lists line numbers", async () => {
    const csv = [
      "Student ID,Salutation,Full Name (12th),First Name,Middle,Last,Roll,Class,Section,Enrollment No,DOB,Birth Place,Email,Qualification,Mobile,Phone,Gender,Category",
      `CSV-OK-${suffix},Mr,Good Student,Good,,Student,1,${className},A,EN1,2005-01-01,Indore,good-${suffix}@college.local,12th,9000000002,,MALE,GEN ${suffix}`,
      `CSV-BAD-${suffix},Mr,Bad Student,, ,Student,2,${className},A,EN2,2005-01-01,Indore,bad-${suffix}@college.local,12th,9000000003,,MALE,GEN ${suffix}`,
    ].join("\n");
    const form = new FormData();
    form.append("file", new File([csv], "students.csv", { type: "text/csv" }));
    const res = await importPost(
      new Request("http://local/api/v1/students/import", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      }),
    );
    const body = (await res.json()) as {
      error?: string;
      inserted?: number;
      errors?: Array<{ line: number }>;
    };
    expect(res.status).toBe(422);
    expect(body.error).toBe("validation_error");
    expect(body.errors?.[0]?.line).toBe(3);
    const leaked = await prisma.student.findFirst({
      where: { admissionNo: `CSV-OK-${suffix}` },
    });
    expect(leaked).toBeNull();
  });
});
