import { describe, expect, it } from "vitest";
import { GET as meGet } from "@/app/api/v1/auth/me/route";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { PATCH as patchUser } from "@/app/api/v1/users/[id]/route";

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

describe("last SuperAdmin protection", () => {
  it("cannot disable the last SuperAdmin", async () => {
    const token = await login("admin", "staff");
    const meRes = await meGet(
      new Request("http://local/api/v1/auth/me", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    const me = (await meRes.json()) as { user: { id: string } };
    const res = await patchUser(
      new Request(`http://local/api/v1/users/${me.user.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: false }),
      }),
      { params: Promise.resolve({ id: me.user.id }) },
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("conflict");
  });
});
