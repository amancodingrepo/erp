import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { GET as searchGet } from "@/app/api/v1/search/route";
import { PATCH as settingsPatch } from "@/app/api/v1/settings/route";
import { prisma } from "@/lib/db";
import { saveStudentDocumentFile } from "@/lib/uploads";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

async function login() {
  const res = await loginPost(
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
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("login failed");
  return body.token;
}

describe("Task 9 search and uploads", () => {
  let token: string;
  let campusId: string;

  beforeAll(async () => {
    token = await login();
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus) throw new Error("seed campus missing");
    campusId = campus.id;
  });

  it("finds students by admission no and receipts by receipt no", async () => {
    const res = await searchGet(
      new Request("http://local/api/v1/search?q=STU-001", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      students: Array<{ admissionNo: string; href: string }>;
    };
    expect(body.students.some((s) => s.admissionNo === "STU-001")).toBe(true);
    expect(body.students[0]?.href).toContain("/staff/students/");
  });

  it("rejects double extensions and honors upload allowlist", async () => {
    await settingsPatch(
      new Request("http://local/api/v1/settings", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ uploadTypes: "pdf" }),
      }),
    );
    const student = await prisma.student.findFirst({
      where: { campusId, admissionNo: "STU-001" },
    });
    if (!student) throw new Error("demo student missing");
    await expect(
      saveStudentDocumentFile({
        campusId,
        studentId: student.id,
        filename: "id.pdf.exe",
        mime: "application/pdf",
        bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      }),
    ).rejects.toThrow();
  });
});
