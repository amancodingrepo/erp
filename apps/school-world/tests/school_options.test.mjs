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

// Reproduced locally on 2026-11-02: Main Campus current session is "2025-26", the only
// student's enrollment is "2026-27", and a calendar year from that date is "2026-2027".
test("the current session is one year, not a student's year and not the calendar year", () => {
  const bootstrap = {
    currentSessionId: "current",
    academicYears: [
      { id: "later", label: "2026-27", isCurrent: true },
      { id: "current", label: "2025-26", isCurrent: true },
    ],
  };
  const options = optionsFromBootstrap(bootstrap);
  assert.equal(options.currentAcademicYear, "2025-26");
  assert.deepEqual(options.academicYears, ["2026-27", "2025-26"]);
  withSchool(options, () => {
    const today = new Date("2026-11-02T00:00:00");
    assert.equal(academicYearNow(today), "2025-26");
    assert.equal(currentAcademicYear(), "2025-26");
    assert.equal(defaultAcademicYear(), "2025-26");
    assert.ok(academicYearOptions("2026-27").includes("2025-26"));
  });
});

test("current-session screens do not invent a second academic year", () => {
  const src = fileURLToPath(new URL("../src/", import.meta.url));
  const definers = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!/\.(jsx?|mjs)$/.test(name) || /school-options\.js$/.test(name)) continue;
      readFileSync(path, "utf8").split("\n").forEach((line, index) => {
        if (/function academicYearNow\b|academicYearNow\s*=\s*(?:function|\()/.test(line)) definers.push(`${path.slice(src.length)}:${index + 1}`);
      });
    }
  })(src);
  assert.deepEqual(definers, []);
  const read = (rel) => readFileSync(fileURLToPath(new URL("../src/" + rel, import.meta.url)), "utf8");
  assert.doesNotMatch(read("pages/Attendance/AttendanceModulePage.jsx"), /knownYears\[0\]/);
  assert.doesNotMatch(read("pages/Templates/PerformanceReport/PerformanceReportPage.jsx"), /reportYear \|\| yearOptions\[0\]|yearOptions\[0\] \|\| academicYearNow/);
  assert.doesNotMatch(read("pages/Fees/useFeesModuleState.js"), /defaultAcademicYear\(students\[0\]/);
  assert.doesNotMatch(read("pages/MyBranch/AcademicOperationPage.jsx"), /yearsLabels\[0\]/);
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

test("school lists (categories, staff categories, leave types) come from the school's records", () => {
  const src = (rel) => readFileSync(fileURLToPath(new URL("../src/" + rel, import.meta.url)), "utf8");
  assert.doesNotMatch(src("pages/MyBranch/AcademicOperationPage.jsx"), /Tournament Leave|LEAVE_TYPE_OPTIONS/);
  assert.match(src("pages/MyBranch/AcademicOperationPage.jsx"), /\/v1\/leave-types/);
  assert.doesNotMatch(src("pages/MyBranch/subpages/AdmitStudentIdentityForm.jsx"), /"OBC"|CATEGORY_OPTIONS/);
  assert.doesNotMatch(src("pages/Students/StudentDetailsTab.jsx"), /"OBC"/);
  assert.doesNotMatch(src("pages/MyBranch/subpages/ManageStaffPage.jsx"), /ROLE_CATEGORIES|"Uniforms"|-- Select Bank --/);
  for (const rel of ["student-form-utils.js", "main.jsx", "pages/Students/bulkStudentImport.js", "pages/MyBranch/subpages/AdmitNewStudentPage.jsx"]) {
    assert.doesNotMatch(src(rel), /\|\|\s*"Indian"|\?\?\s*"Indian"|nationality: "Indian"|"OTHER"/, rel + " has no built-in nationality or category");
  }
});

test("listNames keeps the school's order and drops blanks and repeats", async () => {
  const { listNames, withCurrent } = await import("../src/useSchoolList.js");
  assert.deepEqual(listNames([{ name: " General " }, { name: "" }, { name: "General" }, { name: "EWS" }, null]), ["General", "EWS"]);
  assert.deepEqual(listNames(undefined), []);
  assert.deepEqual(withCurrent(["General"], "Old category"), ["Old category", "General"]);
  assert.deepEqual(withCurrent(["General"], "General"), ["General"]);
});
