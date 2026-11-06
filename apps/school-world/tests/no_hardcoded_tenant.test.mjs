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
    if (/sanford/i.test(text)) offenders.push(file.slice(SRC.length) + ": Sanford");
    if (/from\s+["'][^"']*student-data(\.js)?["']/.test(text)) offenders.push(file.slice(SRC.length) + ": imports student-data");
  }
  assert.deepEqual(offenders, []);
});

const read = (rel) => readFileSync(join(SRC, rel), "utf8");

test("staff ID cards carry the school's own name, never the product name", () => {
  assert.doesNotMatch(read("pages/MyBranch/subpages/ManageStaffPage.jsx"), /\|\|\s*["']School World["']/);
});

test("the dashboard greets the signed-in person, not a fixed role title", () => {
  const hero = read("pages/Dashboard/DashboardHero.jsx");
  assert.doesNotMatch(hero, /t\(["']School Admin["']\)|t\(["']School Team["']\)/);
  assert.match(hero, /useDatabaseSession/);
});

test("the Notice Board has no demo notices, people or vehicle numbers", () => {
  const utils = read("pages/NoticeBoard/noticeBoardUtils.js");
  const board = read("pages/NoticeBoard/NoticeBoardModule.jsx");
  for (const text of [utils, board]) {
    assert.doesNotMatch(text, /seedNotices|DEFAULT_NOTICE_ROUTES|MP09[A-Z]{2}\d{4}|JYOTI SHASTRI|PRIYANKA JAIN/);
    assert.doesNotMatch(text, /localStorage|readStore\(/);
  }
  assert.doesNotMatch(board, /"School Office"/, "the author is the signed-in person");
});

test("the parent and teacher portal signs out from the profile menu", () => {
  const header = read("pages/NoticeBoard/RecipientPortalHeader.jsx");
  assert.match(header, /PortalTopbarActions/);
  assert.doesNotMatch(header, /LogOut|onLogout|>School World</);
});

test("no framework or sample icons stand in for a school's logo", () => {
  const erpPublic = fileURLToPath(new URL("../../erp/public/", import.meta.url));
  const appDir = fileURLToPath(new URL("../../erp/src/app/", import.meta.url));
  for (const name of ["next.svg", "vercel.svg", "file.svg", "globe.svg", "window.svg"]) {
    assert.throws(() => statSync(join(erpPublic, name)), undefined, name + " is Next.js sample art");
  }
  assert.throws(() => statSync(join(appDir, "favicon.ico")), undefined, "favicon.ico was the Next.js default icon");
  assert.match(read("components/topbar/SchoolTabIcon.jsx"), /logoUrl/, "the tab shows the school's own logo");
});
