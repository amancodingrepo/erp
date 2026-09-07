import { beforeAll, describe, expect, it } from "vitest";
import {
  GET as customGet,
  POST as customPost,
} from "@/app/api/v1/custom-fields/route";
import { GET as receiptGet } from "@/app/api/v1/fees/receipts/[receiptNo]/route";
import { GET as modulesGet, PATCH as modulesPatch } from "@/app/api/v1/modules/route";
import { PATCH as settingsPatch } from "@/app/api/v1/settings/route";
import { POST as studentsPost } from "@/app/api/v1/students/route";
import { NAV } from "@/lib/catalog/nav";
import { filterNav } from "@/lib/catalog/nav-permissions";
import { prisma } from "@/lib/db";
import { json, login, req } from "./helpers";

const suffix = `acc-set-${Date.now()}`;

describe("acceptance Settings", () => {
  let token: string;
  let campusId: string;
  let sessionId: string;
  const institute = `Indore College ${suffix}`;

  beforeAll(async () => {
    const auth = await login("admin");
    if (!auth.token) throw new Error("login failed");
    token = auth.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    campusId = campus.id;
    sessionId = campus.currentSessionId;
  });

  it("Change institute name → receipts pick it up", async () => {
    const patched = await json(
      await settingsPatch(req("PATCH", "/api/v1/settings", token, { name: institute })),
    );
    expect(patched.status).toBe(200);
    const student = await prisma.student.create({
      data: { campusId, admissionNo: `SET-${suffix}`, firstName: "Setu" },
    });
    const invoice = await prisma.feeInvoice.create({
      data: { studentId: student.id, sessionId, total: 100, status: "DUE" },
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

  it("Turn module hostel off → API 404/403 and nav hidden", async () => {
    const off = await json(
      await modulesPatch(
        req("PATCH", "/api/v1/modules", token, { key: "hostel", enabled: false }),
      ),
    );
    expect(off.status).toBe(200);
    expect((off.body.flags as Record<string, boolean>).hostel).toBe(false);
    const listed = await json(await modulesGet(req("GET", "/api/v1/modules", token)));
    expect((listed.body.flags as Record<string, boolean>).hostel).toBe(false);
    const admin = {
      id: "u1",
      campusId,
      actorType: "STAFF" as const,
      roles: ["SuperAdmin"],
      permissions: [] as string[],
    };
    const hrefs = filterNav(NAV, admin, listed.body.flags as Record<string, boolean>).flatMap(
      (g) => g.items.map((i) => i.href),
    );
    expect(hrefs).not.toContain("/staff/hostel");
    const teacher = await login("teacher");
    const forbidden = await json(
      await modulesPatch(
        req("PATCH", "/api/v1/modules", teacher.token!, {
          key: "hostel",
          enabled: true,
        }),
      ),
    );
    expect(forbidden.status).toBe(403);
  });

  it("Custom field belongTo=Student type=Dropdown appears on create form", async () => {
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
  });
});
