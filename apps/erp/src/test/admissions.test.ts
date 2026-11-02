import { beforeAll, describe, expect, it } from "vitest";
import { GET as applyGet } from "@/app/api/v1/public/apply/route";
import { POST as applyPost } from "@/app/api/v1/public/applications/route";
import { POST as enrollPost } from "@/app/api/v1/applications/[id]/enroll/route";
import { POST as payPost } from "@/app/api/v1/applications/[id]/pay/route";
import { GET as listGet } from "@/app/api/v1/applications/route";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `adm-${Date.now()}`;

function req(method: string, path: string, token?: string, payload?: unknown) {
  return new Request(`http://local${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(payload !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

describe("Phase B online admission", () => {
  let token: string;
  let classId: string;
  let sectionId: string;
  let programId: string;
  let applicationId: string;
  let applicationNo: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("POST", "/api/v1/auth/login", undefined, {
        username: "admin",
        password: SEED_PASSWORD,
        portal: "staff",
      }),
    );
    const loginBody = (await loginRes.json()) as { token?: string };
    if (!loginBody.token) throw new Error(`login failed: ${loginRes.status}`);
    token = loginBody.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus) throw new Error("seed campus missing");
    const klass = await prisma.class.findFirst({
      where: { program: { department: { campusId: campus.id } } },
      include: { sections: true },
    });
    if (!klass?.sections[0]) throw new Error("seed class missing");
    classId = klass.id;
    sectionId = klass.sections[0].id;
    programId = klass.programId;
  });

  it("public catalog lists programs and fee", async () => {
    const res = await applyGet(new Request("http://local/api/v1/public/apply"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      applicationFee: string;
      programs: unknown[];
      campus: { name: string };
    };
    expect(Number(body.applicationFee)).toBeGreaterThan(0);
    expect(body.campus.name).toBeTruthy();
  });

  it("public form creates an unpaid application", async () => {
    const res = await applyPost(
      req("POST", "/api/v1/public/applications", undefined, {
        firstName: "Anika",
        lastName: "Joshi",
        mobile: "9000000099",
        email: `anika.${suffix}@example.com`,
        fatherName: "Rahul Joshi",
        parentEmail: `rahul.${suffix}@example.com`,
        dob: "2010-06-15",
        gender: "FEMALE",
        programId,
        previousQualification: "Class 10 (SSC / Matric)",
        score: 88.5,
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      applicationNo: string;
      paymentStatus: string;
    };
    applicationId = body.id;
    applicationNo = body.applicationNo;
    expect(applicationNo).toMatch(/^APP-\d{4}-\d{4}$/);
    expect(body.paymentStatus).toBe("UNPAID");
  });

  it("enroll is rejected until the application fee is paid", async () => {
    const res = await enrollPost(
      req("POST", `/api/v1/applications/${applicationId}/enroll`, token, {
        classId,
        sectionId,
      }),
      { params: Promise.resolve({ id: applicationId }) },
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fields?: { paymentStatus?: string } };
    expect(body.fields?.paymentStatus).toMatch(/unpaid/i);
  });

  it("staff records fee then enrolls a student", async () => {
    const paid = await payPost(
      req("POST", `/api/v1/applications/${applicationId}/pay`, token, {
        method: "UPI",
      }),
      { params: Promise.resolve({ id: applicationId }) },
    );
    expect(paid.status).toBe(200);
    const enrolled = await enrollPost(
      req("POST", `/api/v1/applications/${applicationId}/enroll`, token, {
        classId,
        sectionId,
        admissionNo: `ADM-${suffix}`,
      }),
      { params: Promise.resolve({ id: applicationId }) },
    );
    expect(enrolled.status).toBe(201);
    const body = (await enrolled.json()) as {
      admissionNo: string;
      status: string;
      portals?: {
        campusCode: string;
        student: { username: string; password: string; portal: string };
        parent: { username: string; password: string; portal: string } | null;
        mail?: { student?: string; parent?: string | null };
      };
    };
    expect(body.admissionNo).toBe(`ADM-${suffix}`);
    expect(body.status).toBe("ENROLLED");
    expect(body.portals?.student.username).toBeTruthy();
    expect(body.portals?.student.password).toMatch(/^Portal@/);
    expect(body.portals?.parent?.username).toBeTruthy();
    expect(["sent", "logged", "failed"]).toContain(body.portals?.mail?.student);
    const student = await prisma.student.findFirst({
      where: { admissionNo: `ADM-${suffix}` },
    });
    expect(student?.firstName).toBe("Anika");
    expect(student?.userId).toBeTruthy();
    const studentLogin = await loginPost(
      req("POST", "/api/v1/auth/login", undefined, {
        username: body.portals!.student.username,
        password: body.portals!.student.password,
        portal: "student",
        campusCode: "MAIN",
      }),
    );
    expect(studentLogin.status).toBe(200);
    const parentLogin = await loginPost(
      req("POST", "/api/v1/auth/login", undefined, {
        username: body.portals!.parent!.username,
        password: body.portals!.parent!.password,
        portal: "parent",
        campusCode: "MAIN",
      }),
    );
    expect(parentLogin.status).toBe(200);
  });

  it("staff inbox lists the application", async () => {
    const res = await listGet(
      req("GET", `/api/v1/applications?q=${applicationNo}`, token),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ applicationNo: string; enrolled: boolean }>;
    };
    expect(body.data.some((r) => r.applicationNo === applicationNo && r.enrolled)).toBe(
      true,
    );
  });
});
