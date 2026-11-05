import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// SidebarModulePage renders each module. A module that takes a userRole prop falls back to
// "staff" when the page forgets to pass it: Admission/Enquiry Form disabled "Add New" for every
// admin that way. Every module that declares userRole must be rendered with it.
const src = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const page = src("../src/app/SidebarModulePage.jsx");

const imports = [...page.matchAll(/import\s+(\w+)\s+from\s+"(\.\.\/pages\/[^"]+\.jsx)"/g)].map((m) => ({ name: m[1], file: m[2] }));

test("every module that takes userRole is given it", () => {
  const checked = [];
  for (const { name, file } of imports) {
    const source = src("../src/app/" + file);
    const declares = new RegExp(String.raw`export default function ${name}\s*\(\s*\{[^}]*\buserRole\b`).test(source);
    if (!declares) continue;
    const uses = [...page.matchAll(new RegExp(String.raw`<${name}\b([^>]*)/?>`, "g"))];
    assert.ok(uses.length, name + " is imported but never rendered");
    for (const use of uses) assert.match(use[1], /\buserRole=\{/, name + " is rendered without userRole");
    checked.push(name);
  }
  assert.ok(checked.includes("AdmissionFormsManagerPage"), "the admission forms page is covered");
});
