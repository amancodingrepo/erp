import { forbidden } from "./errors";

function hostOf(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/** Cookie-authenticated mutations must come from this host. Bearer API tests skip. */
export function assertCsrf(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  if (request.headers.get("authorization")?.startsWith("Bearer ")) return;
  if (process.env.NODE_ENV !== "production") return;

  const host = request.headers.get("host");
  const originHost = hostOf(request.headers.get("origin"));
  const refererHost = hostOf(request.headers.get("referer"));
  const from = originHost ?? refererHost;
  if (!host || !from || from !== host) {
    throw forbidden("csrf");
  }
}
