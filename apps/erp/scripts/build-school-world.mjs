import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const erpRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schoolWorld = path.resolve(erpRoot, "..", "school-world");
const outDir = path.resolve(erpRoot, "public", "school-world");

const result = spawnSync("npm", ["run", "build"], {
  cwd: schoolWorld,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    SCHOOL_WORLD_BASE: "/school-world/",
    SCHOOL_WORLD_OUT: outDir,
  },
});

process.exit(result.status ?? 1);
