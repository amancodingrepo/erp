import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as livePost } from "@/app/api/v1/live-classes/route";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

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

describe("Phase C live class URLs", () => {
  let token: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("x", { username: "admin", password: SEED_PASSWORD, portal: "staff" }),
    );
    const body = (await loginRes.json()) as { token?: string };
    if (!body.token) throw new Error("login failed");
    token = body.token;
  });

  it("stores https Meet URLs and rejects javascript or other hosts", async () => {
    const bad = await livePost(
      req(token, {
        provider: "GMEET",
        title: "Phish",
        meetingUrl: "javascript:alert(1)",
        startsAt: new Date().toISOString(),
      }),
    );
    expect(bad.status).toBe(422);
    const other = await livePost(
      req(token, {
        provider: "ZOOM",
        title: "Offsite",
        meetingUrl: "https://evil.example/j/1",
        startsAt: new Date().toISOString(),
      }),
    );
    expect(other.status).toBe(422);
    const ok = await livePost(
      req(token, {
        provider: "GMEET",
        title: "FY lecture",
        meetingUrl: "https://meet.google.com/aaa-bbbb-ccc",
        startsAt: new Date().toISOString(),
      }),
    );
    expect(ok.status).toBe(201);
  });
});
