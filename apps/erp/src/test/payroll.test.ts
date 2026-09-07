import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { GET as elementsGet } from "@/app/api/v1/payroll/elements/route";
import { POST as structurePost } from "@/app/api/v1/payroll/structure/route";
import { POST as runPost } from "@/app/api/v1/payroll/runs/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

function req(token: string, payload?: unknown) {
  return new Request("http://local/api", {
    method: payload ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(payload ? { "content-type": "application/json" } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

describe("Phase C payroll statutory", () => {
  let token: string;
  let staffId: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("x", { username: "admin", password: SEED_PASSWORD, portal: "staff" }),
    );
    const body = (await loginRes.json()) as { token?: string };
    if (!body.token) throw new Error("login failed");
    token = body.token;
    const staff = await prisma.staff.findFirst({ where: { employeeId: "EMP-T01" } });
    if (!staff) throw new Error("seed teacher missing");
    staffId = staff.id;
  });

  it("computes PF ceiling and refuses a second run for the same month", async () => {
    const elementsRes = await elementsGet(req(token));
    expect(elementsRes.status).toBe(200);
    const elements = ((await elementsRes.json()) as {
      data: Array<{ id: string; code: string }>;
    }).data;
    const basic = elements.find((e) => e.code === "BASIC");
    const da = elements.find((e) => e.code === "DA");
    const pf = elements.find((e) => e.code === "PF");
    expect(basic && da && pf).toBeTruthy();
    const statutory = await structurePost(
      req(token, { staffId, elementId: pf!.id, amount: "100" }),
    );
    expect(statutory.status).toBe(422);
    expect(
      (await structurePost(req(token, { staffId, elementId: basic!.id, amount: "12000" }))).status,
    ).toBe(201);
    expect(
      (await structurePost(req(token, { staffId, elementId: da!.id, amount: "8000" }))).status,
    ).toBe(201);
    const month = 11;
    const year = 2031;
    const run = await runPost(req(token, { year, month }));
    expect(run.status).toBe(201);
    const body = (await run.json()) as {
      slips: Array<{ pf: string; esi: string; pt: string; net: string }>;
    };
    const slip = body.slips.find((s) => Number(s.pf) > 0) ?? body.slips[0];
    expect(slip.pf).toBe("1800");
    expect(Number(slip.net)).toBeGreaterThan(0);
    const dup = await runPost(req(token, { year, month }));
    expect(dup.status).toBe(409);
  });
});
