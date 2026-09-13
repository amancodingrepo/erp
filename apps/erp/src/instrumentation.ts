export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  const { createDbDump } = await import("./lib/db-backup");
  const dayMs = 24 * 60 * 60 * 1000;
  const run = () =>
    createDbDump().catch((error) => {
      console.error("scheduled db dump failed", error);
    });
  setTimeout(run, 60_000);
  setInterval(run, dayMs);
}
