import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { EXTRA_DESK_ITEMS, NATIVE_SCREENS } from "../src/pages/Campus/registry.js";
import { CAMPUS_DESK } from "../src/pages/CampusDesk/campusDeskLinks.js";

const hrefs = new Set([
  ...CAMPUS_DESK.flatMap((group) => group.items.map((item) => item.href)),
  ...EXTRA_DESK_ITEMS.map((item) => item.href),
]);
const registrySource = readFileSync(new URL("../src/pages/Campus/registry.js", import.meta.url), "utf8");

test("every native screen can be reached from the campus desk", () => {
  assert.deepEqual(Object.keys(NATIVE_SCREENS).filter((href) => !hrefs.has(href)), []);
});

test("extra desk items name an existing group and a native screen", () => {
  const groups = new Set(CAMPUS_DESK.map((group) => group.label));
  for (const item of EXTRA_DESK_ITEMS) {
    assert.ok(groups.has(item.group), `${item.href}: unknown group ${item.group}`);
    assert.ok(NATIVE_SCREENS[item.href], `${item.href}: extra item is not a native screen`);
  }
});

test("every native screen points at an exported component in an existing batch file", () => {
  for (const [href, [batch, name]] of Object.entries(NATIVE_SCREENS)) {
    const file = new URL(`../src/pages/Campus/screens/${batch}.jsx`, import.meta.url);
    assert.ok(existsSync(file), `${href}: missing batch file ${batch}.jsx`);
    const source = readFileSync(file, "utf8");
    assert.match(source, new RegExp(`export (function|const) ${name}\\b`), `${href}: ${batch}.jsx does not export ${name}`);
    assert.ok(registrySource.includes(`"${batch}": () => import(`), `${href}: registry has no loader for ${batch}`);
  }
});
