import { describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { clearRateLimit } from "@/lib/rate-limit";

async function badLogin(username: string) {
  return loginPost(
    new Request("http://local/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username,
        password: "definitely-wrong",
        portal: "staff",
      }),
    }),
  );
}

describe("Task 12 login rate limit", () => {
  it("returns 429 on the 6th bad password even after in-memory buckets are cleared", async () => {
    const username = `ratelimit-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const res = await badLogin(username);
      expect(res.status).toBe(401);
    }
    const sixth = await badLogin(username);
    expect(sixth.status).toBe(429);
    const body = (await sixth.json()) as { error?: string };
    expect(body.error).toBe("rate_limited");

    clearRateLimit(`login:${username}:local`);
    const afterRestart = await badLogin(username);
    expect(afterRestart.status).toBe(429);
  });
});
