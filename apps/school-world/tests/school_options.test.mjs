import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  academicYearNow,
  academicYearOptions,
  classOptions,
  currentAcademicYear,
  defaultAcademicYear,
  optionsFromBootstrap,
} from "../src/school-options.js";

// Years and classes come from the school's own sessions and classes (GET /api/bootstrap), not a
// fixed "2026-2027" or "PRE NURSERY A". See docs/school-world-hardcoded-values.md (section 3).

const bootstrap = {
  academicYears: [
    { label: "2024-2025", isCurrent: false },
    { label: "2025-2026", isCurrent: true },
  ],
  classes: [{ class_name: "Grade 1" }, { class_name: "Grade 2" }, { className: "Grade 1" }],
};

function withSchool(config, fn) {
  const previous = globalThis.window;
  globalThis.window = { SCHOOL_DIARY_CONFIG: config };
  try { return fn(); } finally { globalThis.window = previous; }
}

test("bootstrap gives the school's years, its current year and its classes", () => {
  assert.deepEqual(optionsFromBootstrap(bootstrap), {
    academicYears: ["2024-2025", "2025-2026"],
    currentAcademicYear: "2025-2026",
    classes: ["Grade 1", "Grade 2"],
  });
  assert.deepEqual(optionsFromBootstrap({}), { academicYears: [], currentAcademicYear: "", classes: [] });
});

test("screens offer the school's years and classes, keeping a record's own value", () => {
  withSchool(optionsFromBootstrap(bootstrap), () => {
    assert.deepEqual(academicYearOptions(), ["2025-2026", "2024-2025"]);
    assert.deepEqual(academicYearOptions("2019-2020", [""]), ["2025-2026", "2024-2025", "2019-2020"]);
    assert.deepEqual(classOptions(), ["Grade 1", "Grade 2"]);
    assert.deepEqual(classOptions("Grade 9"), ["Grade 1", "Grade 2", "Grade 9"]);
  });
});

test("new records start in the school's current year, or none, never a fixed year", () => {
  withSchool(optionsFromBootstrap(bootstrap), () => {
    assert.equal(currentAcademicYear(), "2025-2026");
    assert.equal(defaultAcademicYear(), "2025-2026");
    assert.equal(defaultAcademicYear("", "2024-2025"), "2024-2025");
  });
  withSchool({}, () => {
    assert.equal(defaultAcademicYear(), "");
    assert.deepEqual(classOptions(), []);
  });
});

test("screens that must show a year fall back to the calendar only when the school has none", () => {
  withSchool({ currentAcademicYear: "2025-2026" }, () => assert.equal(academicYearNow(new Date("2030-06-01")), "2025-2026"));
  withSchool({}, () => {
    assert.equal(academicYearNow(new Date("2027-06-01T00:00:00")), "2027-2028");
    assert.equal(academicYearNow(new Date("2027-02-01T00:00:00")), "2026-2027");
  });
});

test("no screen carries a fixed academic year or default class", () => {
  const src = fileURLToPath(new URL("../src/", import.meta.url));
  const offenders = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!/\.(jsx?|mjs)$/.test(name) || /i18n\.jsx$|school-options\.js$/.test(name)) continue;
      readFileSync(path, "utf8").split("\n").forEach((line, index) => {
        // Placeholders and example rows in downloadable CSV templates are fine.
        if (/placeholder=|example|REPLACE_WITH_STUDENT_ID|for example/i.test(line)) return;
        if (/["']20\d\d-20\d\d["']/.test(line) || /["']PRE NURSERY [A-Z]["']/.test(line)) offenders.push(`${path.slice(src.length)}:${index + 1}`);
      });
    }
  })(src);
  assert.deepEqual(offenders, []);
});
