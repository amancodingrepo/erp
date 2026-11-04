import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// The Events page hands each child a hand-written context object. A name a child destructures
// but the page forgets to pass is undefined at runtime: the recipient picker's Close, X and
// Save buttons all called setRecipientPickerOpen, which was missing, and did nothing.
const dir = new URL("../src/pages/Events/", import.meta.url);
const read = (file) => readFileSync(new URL(file, dir), "utf8");
const page = read("EventsCalendar.jsx");

function passed(component) {
  const match = page.match(new RegExp("<" + component + String.raw`\s+context=\{\{([\s\S]*?)\}\}`));
  assert.ok(match, component + " is rendered with a context object");
  return new Set(match[1].split(",").map((name) => name.trim()).filter(Boolean));
}

function used(file) {
  return [...read(file).matchAll(/const\s*\{([^}]*)\}\s*=\s*context/g)]
    .flatMap((m) => m[1].split(","))
    .map((name) => name.trim().split(":")[0].trim())
    .filter(Boolean);
}

const children = {
  EventsDialogs: ["EventsDialogs.jsx", "EventEditorDialog.jsx", "EventClassPickerDialog.jsx", "EventRecipientPickerDialog.jsx", "EventDetailsDialog.jsx"],
  EventsCalendarView: ["EventsCalendarView.jsx"],
  EventsDetailSections: ["EventsDetailSections.jsx"],
};

for (const [component, files] of Object.entries(children)) {
  test(component + " passes every name its dialogs use", () => {
    const given = passed(component);
    for (const file of files) {
      assert.deepEqual(used(file).filter((name) => !given.has(name)), [], file + " uses names the page does not pass");
    }
  });
}
