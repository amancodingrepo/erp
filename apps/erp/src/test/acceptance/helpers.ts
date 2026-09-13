import { POST as loginPost } from "@/app/api/v1/auth/login/route";

export const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

export function req(
  method: string,
  path: string,
  token: string,
  payload?: unknown,
  extra?: HeadersInit,
) {
  return new Request(`http://local${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(payload !== undefined ? { "content-type": "application/json" } : {}),
      ...extra,
    },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

export async function json(res: Response) {
  return {
    status: res.status,
    body: (await res.json()) as Record<string, unknown>,
  };
}

export async function login(
  username: string,
  portal: "staff" | "student" | "parent" = "staff",
  password = SEED_PASSWORD,
  campusCode?: string,
) {
  const res = await loginPost(
    new Request("http://local/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        portal,
        ...(campusCode ? { campusCode } : {}),
      }),
    }),
  );
  const body = (await res.json()) as { token?: string; error?: string };
  return { status: res.status, token: body.token, error: body.error, body };
}
