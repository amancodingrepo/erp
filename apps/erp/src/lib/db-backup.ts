import { spawn } from "node:child_process";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { uploadsRoot } from "./uploads";

const KEEP = 7;

export function backupDir() {
  return path.join(uploadsRoot(), "backups");
}

export async function listDbDumps() {
  try {
    const dir = backupDir();
    const names = await readdir(dir);
    const rows = await Promise.all(
      names
        .filter((n) => n.endsWith(".dump") || n.endsWith(".sql"))
        .map(async (name) => {
          const s = await stat(path.join(dir, name));
          return { name, bytes: s.size, createdAt: s.mtime.toISOString() };
        }),
    );
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

async function prune() {
  const rows = await listDbDumps();
  for (const row of rows.slice(KEEP)) {
    await unlink(path.join(backupDir(), row.name));
  }
}

export async function createDbDump() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL missing");
  }
  await mkdir(backupDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `erp-${stamp}.dump`;
  const file = path.join(backupDir(), name);
  await new Promise<void>((resolve, reject) => {
    const child = spawn("pg_dump", ["--format=custom", `--file=${file}`, url], {
      env: process.env,
      windowsHide: true,
    });
    let err = "";
    child.stderr?.on("data", (chunk) => {
      err += String(chunk);
    });
    child.on("error", (error) => {
      reject(
        new Error(
          `pg_dump not available (${error.message}). Install postgresql-client.`,
        ),
      );
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `pg_dump exited ${code}`));
    });
  });
  await prune();
  return { name, dir: backupDir() };
}
