const DEV_FALLBACK = "dev-only-not-for-production";
const PLACEHOLDERS = new Set([
  "changeme",
  "changeme-generate-a-long-random-string",
]);

function isProductionBuild() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function requireAuthSecret() {
  const s = process.env.AUTH_SECRET ?? "";
  if (process.env.NODE_ENV === "production" && !isProductionBuild()) {
    if (s.length < 32 || PLACEHOLDERS.has(s)) {
      throw new Error("AUTH_SECRET must be >= 32 chars in production");
    }
  }
  return s || DEV_FALLBACK;
}
