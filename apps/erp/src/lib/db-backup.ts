import { spawn } from "child_process";
import { mkdir, readdir, stat, unlink } from "fs/promises";
import path from "path";
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

export function safeDumpName(raw: string) {
  const name = raw.trim().replace(/\\/g, "/").split("/").pop() ?? "";
  if (!/^[A-Za-z0-9._-]+\.(dump|sql)$/.test(name)) {
    throw new Error("invalid dump name");
  }
  return name;
}

export async function restoreDbDump(rawName: string) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const name = safeDumpName(rawName);
  const file = path.join(backupDir(), name);
  await stat(file);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "pg_restore",
      ["--clean", "--if-exists", "--no-owner", "--no-acl", `--dbname=${url}`, file],
      { env: process.env, windowsHide: true },
    );
    let err = "";
    child.stderr?.on("data", (chunk) => {
      err += String(chunk);
    });
    child.on("error", (error) => {
      reject(
        new Error(
          `pg_restore not available (${error.message}). Install postgresql-client.`,
        ),
      );
    });
    child.on("close", (code) => {
      if (code === 0 || code === 1) resolve();
      else reject(new Error(err.trim() || `pg_restore exited ${code}`));
    });
  });
  return { name };
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
