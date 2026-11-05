import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// School World is multi-tenant: no screen may carry one school's name, logo or people.
// See docs/school-world-hardcoded-values.md.
const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
})(SRC);

test("no bundled school logo images", () => {
  const images = files.filter((f) => /\.(png|jpe?g|webp|svg|gif)$/i.test(f) && /logo/i.test(f));
  assert.deepEqual(images.map((f) => f.slice(SRC.length)), [], "school logos come from the school's settings (GET /api/school/logo)");
});

test("no built-in school name or bundled student fixtures", () => {
  const offenders = [];
  for (const file of files.filter((f) => /\.(jsx?|mjs|css)$/.test(f) && !/i18n\.jsx$/.test(f))) {
    const text = readFileSync(file, "utf8");
    if (/sanford/i.test(text.replace(/sanford-school-logo\b/g, ""))) offenders.push(file.slice(SRC.length) + ": Sanford");
    if (/from\s+["'][^"']*student-data(\.js)?["']/.test(text)) offenders.push(file.slice(SRC.length) + ": imports student-data");
  }
  assert.deepEqual(offenders, []);
});
