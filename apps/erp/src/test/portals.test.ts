import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { GET as studentGet } from "@/app/api/v1/students/[id]/route";
import { GET as ledgerGet } from "@/app/api/v1/students/[id]/ledger/route";
import { GET as marksheetGet } from "@/app/api/v1/students/[id]/marksheet/route";
import { GET as documentsGet } from "@/app/api/v1/students/[id]/documents/route";
import { POST as payPost } from "@/app/api/v1/fees/payments/route";
import { GET as portalGet } from "@/app/api/v1/portal/dashboard/route";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

async function login(username: string, portal: string) {
  const res = await loginPost(
    new Request("http://local/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password: SEED_PASSWORD, portal }),
    }),
  );
  const body = (await res.json()) as { token?: string; error?: string };
  if (!body.token) {
    throw new Error(`login failed: ${res.status} ${body.error ?? "no token"}`);
  }
  return body.token;
}

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

describe("Task 8 student and parent portals", () => {
  let studentToken: string;
  let parentToken: string;
  let adminToken: string;
  let otherId: string;

  beforeAll(async () => {
    adminToken = await login("admin", "staff");
    studentToken = await login("student1", "student");
    parentToken = await login("parent1", "parent");
    const created = await studentsPost(
      req("POST", "/api/v1/students", adminToken, {
        admissionNo: `OTH-${Date.now()}`,
        firstName: "Other",
      }),
    );
    const body = (await created.json()) as { id: string };
    otherId = body.id;
  });

  it("student cannot read another student", async () => {
    for (const path of [
      `/api/v1/students/${otherId}`,
      `/api/v1/students/${otherId}/ledger`,
      `/api/v1/students/${otherId}/marksheet`,
      `/api/v1/students/${otherId}/documents`,
    ]) {
      const res = path.endsWith("/ledger")
        ? await ledgerGet(req("GET", path, studentToken), {
            params: Promise.resolve({ id: otherId }),
          })
        : path.endsWith("/marksheet")
          ? await marksheetGet(req("GET", path, studentToken), {
              params: Promise.resolve({ id: otherId }),
            })
          : path.endsWith("/documents")
            ? await documentsGet(req("GET", path, studentToken), {
                params: Promise.resolve({ id: otherId }),
              })
            : await studentGet(req("GET", path, studentToken), {
                params: Promise.resolve({ id: otherId }),
              });
      expect([401, 403, 404]).toContain(res.status);
    }
  });

  it("student cannot collect fees", async () => {
    const res = await payPost(
      req("POST", "/api/v1/fees/payments", studentToken, {
        invoiceId: "x",
        amount: 1,
        method: "CASH",
        enrollmentId: "x",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("student dashboard loads own record only", async () => {
    const res = await portalGet(req("GET", "/api/v1/portal/dashboard", studentToken));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      student: { admissionNo: string };
      exams: { status: string };
    };
    expect(body.student.admissionNo).toBe("STU-001");
    expect(body.exams.status === "ok" || body.exams.status === "withheld").toBe(true);
  });

  it("parent dashboard loads the linked child", async () => {
    const res = await portalGet(req("GET", "/api/v1/portal/dashboard", parentToken));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { student: { admissionNo: string } };
    expect(body.student.admissionNo).toBe("STU-001");
  });
});
