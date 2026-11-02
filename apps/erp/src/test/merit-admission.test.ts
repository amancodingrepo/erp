import { beforeAll, describe, expect, it } from "vitest";
import { POST as cutoffPost } from "@/app/api/v1/admission/cutoffs/route";
import { POST as meritPost } from "@/app/api/v1/admission/merit/route";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { prisma } from "@/lib/db";
import { submitApplication } from "@/lib/services/applications";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `merit-${Date.now()}`;

function req(method: string, path: string, token: string, payload?: unknown) {
  return new Request(`http://local${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

describe("Phase B merit cutoff", () => {
  let token: string;
  let campusId: string;
  let programId: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("POST", "/api/v1/auth/login", "x", {
        username: "admin",
        password: SEED_PASSWORD,
        portal: "staff",
      }),
    );
    const body = (await loginRes.json()) as { token?: string };
    if (!body.token) throw new Error("login failed");
    token = body.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus) throw new Error("seed campus missing");
    campusId = campus.id;
    const program = await prisma.program.findFirst({
      where: { department: { campusId } },
    });
    if (!program) throw new Error("seed program missing");
    programId = program.id;
  });

  it("generates ranks and rejects below-cutoff scores", async () => {
    await cutoffPost(
      req("POST", "/api/v1/admission/cutoffs", token, {
        programId,
        roundNo: 1,
        categoryCode: "GEN",
        minScore: 80,
      }),
    );
    const high = await submitApplication(campusId, {
      firstName: "High",
      lastName: suffix,
      programId,
      categoryCode: "GEN",
      score: 91,
    });
    const low = await submitApplication(campusId, {
      firstName: "Low",
      lastName: suffix,
      programId,
      categoryCode: "GEN",
      score: 50,
    });
    const res = await meritPost(
      req("POST", "/api/v1/admission/merit", token, {
        programId,
        roundNo: 1,
      }),
    );
    expect(res.status).toBe(200);
    const highRow = await prisma.application.findUnique({ where: { id: high.id } });
    const lowRow = await prisma.application.findUnique({ where: { id: low.id } });
    expect(highRow?.selectionStatus).toBe("MERIT");
    expect(highRow?.meritRank).toBeGreaterThan(0);
    expect(lowRow?.selectionStatus).toBe("REJECTED");
  });
});
