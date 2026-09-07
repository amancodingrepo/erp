import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as reminderPost } from "@/app/api/v1/reminders/fees/route";
import { POST as templatePost } from "@/app/api/v1/message-templates/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `msg-${Date.now()}`;

function req(token: string, payload: unknown) {
  return new Request("http://local/api", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

describe("Phase B fee reminders", () => {
  let token: string;
  let campusId: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("x", { username: "admin", password: SEED_PASSWORD, portal: "staff" }),
    );
    const body = (await loginRes.json()) as { token?: string };
    if (!body.token) throw new Error("login failed");
    token = body.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    campusId = campus.id;
  });

  it("logs one SMS per student with dues using fee_due template", async () => {
    await templatePost(
      req(token, {
        channel: "SMS",
        name: "fee_due",
        body: "Dear {{name}} {{admissionNo}} pay {{balance}} to {{campus}}",
      }),
    );
    const student = await prisma.student.create({
      data: {
        campusId,
        admissionNo: `MSG-${suffix}`,
        firstName: "Mira",
        mobile: "9000000011",
      },
    });
    await prisma.feeInvoice.create({
      data: {
        studentId: student.id,
        sessionId: (await prisma.campus.findUnique({ where: { id: campusId } }))!
          .currentSessionId!,
        status: "DUE",
        total: 2500,
      },
    });
    const res = await reminderPost(req(token, { channel: "SMS" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { sent: number };
    expect(json.sent).toBeGreaterThanOrEqual(1);
    const log = await prisma.messageLog.findFirst({
      where: { studentId: student.id, channel: "SMS" },
    });
    expect(log?.body).toContain("Mira");
    expect(log?.body).toContain("2500.00");
    expect(log?.status).toBe("logged");
  });
});
