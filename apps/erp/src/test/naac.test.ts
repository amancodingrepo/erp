import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as taskPost } from "@/app/api/v1/naac/tasks/route";
import { POST as assignPost } from "@/app/api/v1/naac/tasks/[id]/assign/route";
import { POST as evidencePost } from "@/app/api/v1/naac/tasks/[id]/evidence/route";
import { POST as completePost } from "@/app/api/v1/naac/assignments/[id]/complete/route";
import { GET as dashboardGet } from "@/app/api/v1/naac/dashboard/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `naac-${Date.now()}`;

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

describe("Phase C NAAC", () => {
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

  it("blocks complete without evidence then reaches 100% after proof", async () => {
    const task = await taskPost(
      req(token, { criterionNumber: 1, title: `SSR ${suffix}` }),
    );
    expect(task.status).toBe(201);
    const taskId = ((await task.json()) as { id: string }).id;
    const assigned = await assignPost(req(token, { staffId }), {
      params: Promise.resolve({ id: taskId }),
    });
    expect(assigned.status).toBe(201);
    const assignmentId = ((await assigned.json()) as { id: string }).id;
    const blocked = await completePost(req(token), {
      params: Promise.resolve({ id: assignmentId }),
    });
    expect(blocked.status).toBe(422);
    const evidence = await evidencePost(
      req(token, { fileUrl: "uploads/naac/proof.pdf", note: "AQAR draft" }),
      { params: Promise.resolve({ id: taskId }) },
    );
    expect(evidence.status).toBe(201);
    const done = await completePost(req(token), {
      params: Promise.resolve({ id: assignmentId }),
    });
    expect(done.status).toBe(200);
    const dash = await dashboardGet(req(token));
    expect(dash.status).toBe(200);
    const body = (await dash.json()) as {
      data: Array<{ number: number; percent: number }>;
    };
    expect(body.data).toHaveLength(7);
    const c1 = body.data.find((r) => r.number === 1);
    expect(c1?.percent).toBeGreaterThan(0);
  });
});
