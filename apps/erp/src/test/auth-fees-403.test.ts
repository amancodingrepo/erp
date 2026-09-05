import { describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as payPost } from "@/app/api/v1/fees/payments/route";

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

async function api(
  method: string,
  path: string,
  token: string,
  payload: unknown,
) {
  const res = await payPost(
    new Request(`http://local${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "idempotency-key": "teacher-cannot-collect",
      },
      body: JSON.stringify(payload),
    }),
  );
  return { status: res.status, body: (await res.json()) as { error?: string } };
}

describe("RBAC fees collect", () => {
  it("teacher cannot collect fees", async () => {
    const token = await login("teacher", "staff");
    const res = await api("POST", "/api/v1/fees/payments", token, {
      invoiceId: "x",
      amount: 1,
      method: "CASH",
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
  });
});
