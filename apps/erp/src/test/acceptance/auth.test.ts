import { ActorType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { GET as statsGet } from "@/app/api/v1/dashboard/stats/route";
import { POST as payPost } from "@/app/api/v1/fees/payments/route";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { clearRateLimit } from "@/lib/rate-limit";
import { json, login, req, SEED_PASSWORD } from "./helpers";

describe("acceptance Auth", () => {
  it("Staff logs in with valid user → dashboard", async () => {
    const auth = await login("admin", "staff");
    expect(auth.status).toBe(200);
    expect(auth.token).toBeTruthy();
    const stats = await json(
      await statsGet(req("GET", "/api/v1/dashboard/stats", auth.token!)),
    );
    expect(stats.status).toBe(200);
    expect(typeof stats.body.students).toBe("number");
  });

  it("Bad password 5 times → rate limit", async () => {
    const username = `acc-rl-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const res = await login(username, "staff", "definitely-wrong");
      expect(res.status).toBe(401);
    }
    const sixth = await login(username, "staff", "definitely-wrong");
    expect(sixth.status).toBe(429);
    expect(sixth.error).toBe("rate_limited");
    clearRateLimit(`login:${username}:local`);
    const afterRestart = await login(username, "staff", "definitely-wrong");
    expect(afterRestart.status).toBe(429);
  });

  it("Student cannot open /api/v1/fees/payments", async () => {
    const auth = await login("student1", "student");
    expect(auth.token).toBeTruthy();
    const res = await payPost(
      req("POST", "/api/v1/fees/payments", auth.token!, {
        invoiceId: "x",
        amount: 1,
        method: "CASH",
        enrollmentId: "x",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("Disabled user cannot login", async () => {
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus) throw new Error("seed campus missing");
    const username = `disabled-${Date.now()}`;
    await prisma.user.create({
      data: {
        campusId: campus.id,
        actorType: ActorType.STAFF,
        username,
        passwordHash: await hashPassword(SEED_PASSWORD),
        isActive: false,
      },
    });
    const res = await login(username, "staff");
    expect(res.status).toBe(401);
    expect(res.token).toBeUndefined();
  });
});
