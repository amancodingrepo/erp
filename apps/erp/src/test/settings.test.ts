import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { GET as settingsGet, PATCH as settingsPatch } from "@/app/api/v1/settings/route";
import {
  GET as customGet,
  POST as customPost,
} from "@/app/api/v1/custom-fields/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { POST as staffPost } from "@/app/api/v1/staff/route";
import { POST as designationsPost } from "@/app/api/v1/designations/route";
import { GET as noticesGet, POST as noticesPost } from "@/app/api/v1/notices/route";
import { GET as receiptGet } from "@/app/api/v1/fees/receipts/[receiptNo]/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `t7-${Date.now()}`;

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

describe("Task 7 staff notices settings", () => {
  let token: string;
  let campusId: string;
  let sessionId: string;
  const institute = `Indore College ${suffix}`;

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
    const loginBody = (await loginRes.json()) as { token?: string };
    if (!loginBody.token) throw new Error("login failed");
    token = loginBody.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    campusId = campus.id;
    sessionId = campus.currentSessionId;
  });

  it("patches institute name and receipts pick it up", async () => {
    const patched = await json(
      await settingsPatch(
        req("PATCH", "/api/v1/settings", token, { name: institute }),
      ),
    );
    expect(patched.status).toBe(200);
    expect(patched.body.name).toBe(institute);

    const got = await json(await settingsGet(req("GET", "/api/v1/settings", token)));
    expect(got.body.name).toBe(institute);

    const student = await prisma.student.create({
      data: {
        campusId,
        admissionNo: `SET-${suffix}`,
        firstName: "Setu",
      },
    });
    const invoice = await prisma.feeInvoice.create({
      data: {
        studentId: student.id,
        sessionId,
        total: 100,
        status: "DUE",
      },
    });
    const receiptNo = `RCP-SET-${suffix}`;
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: 100,
        method: "CASH",
        receiptNo,
        paidAt: new Date(),
      },
    });
    const receipt = await json(
      await receiptGet(req("GET", `/api/v1/fees/receipts/${receiptNo}`, token), {
        params: Promise.resolve({ receiptNo }),
      }),
    );
    expect(receipt.status).toBe(200);
    expect((receipt.body.view as { campusName: string }).campusName).toBe(institute);
  });

  it("custom dropdown field belongs to Student and stores on create", async () => {
    const field = await json(
      await customPost(
        req("POST", "/api/v1/custom-fields", token, {
          belongTo: "Student",
          type: "Dropdown",
          name: `House ${suffix}`,
          values: "Red,Blue,Green",
        }),
      ),
    );
    expect(field.status).toBe(201);
    const list = await json(
      await customGet(req("GET", "/api/v1/custom-fields?belongTo=Student", token)),
    );
    const rows = (list.body as { data: Array<{ name: string; type: string }> }).data;
    expect(rows.some((r) => r.name === `House ${suffix}` && r.type === "Dropdown")).toBe(
      true,
    );

    const created = await json(
      await studentsPost(
        req("POST", "/api/v1/students", token, {
          admissionNo: `CF-${suffix}`,
          firstName: "Casa",
          customFields: [
            { fieldId: (field.body as { id: string }).id, value: "Blue" },
          ],
        }),
      ),
    );
    expect(created.status).toBe(201);
    const stored = await prisma.customFieldValue.findFirst({
      where: { entityId: (created.body as { id: string }).id },
    });
    expect(stored?.value).toBe("Blue");
  });

  it("creates staff with unique employeeId and designation", async () => {
    const des = await json(
      await designationsPost(
        req("POST", "/api/v1/designations", token, { name: `Lecturer ${suffix}` }),
      ),
    );
    expect(des.status).toBe(201);
    const staff = await json(
      await staffPost(
        req("POST", "/api/v1/staff", token, {
          employeeId: `EMP-${suffix}`,
          firstName: "Nisha",
          lastName: "Rao",
          designationId: (des.body as { id: string }).id,
          username: `nisha-${suffix}`,
        }),
      ),
    );
    expect(staff.status).toBe(201);
    expect((staff.body as { userId: string | null }).userId).toBeTruthy();

    const dup = await json(
      await staffPost(
        req("POST", "/api/v1/staff", token, {
          employeeId: `EMP-${suffix}`,
          firstName: "Other",
        }),
      ),
    );
    expect(dup.status).toBe(409);
  });

  it("publishes notices with audience", async () => {
    const notice = await json(
      await noticesPost(
        req("POST", "/api/v1/notices", token, {
          title: `Holiday ${suffix}`,
          body: "Campus closed",
          audience: "staff",
        }),
      ),
    );
    expect(notice.status).toBe(201);
    const listed = await json(
      await noticesGet(req("GET", "/api/v1/notices?audience=staff", token)),
    );
    const rows = (listed.body as { data: Array<{ title: string; audience: string }> }).data;
    expect(rows.some((r) => r.title === `Holiday ${suffix}` && r.audience === "staff")).toBe(
      true,
    );
  });
});
