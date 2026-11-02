import { ok } from "@/lib/http";

export async function POST() {
  const response = ok({ ok: true });
  response.cookies.set("erp_token", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
