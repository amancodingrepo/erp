import assert from "node:assert/strict";
import test from "node:test";
import { formatExcelRejection, validateBulkStudentRows } from "../src/pages/Students/bulkStudentImport.js";

function row(overrides) {
  return {
    _excelRow: 2,
    firstName: "Asha",
    dob: "2016-04-02",
    gender: "Female",
    academicYear: "2025-2026",
    className: "Class 1",
    primaryParent: "Mother",
    motherFirst: "Meera",
    parentPhone: "9876543210",
    parentPassword: "secret1",
    loginMethod: "Phone",
    studentId: "",
    parentEmail: "",
    ...overrides,
  };
}

test("excel parent phones must be 10 digits and cannot be used more than 3 times", () => {
  const shared = ["98765 43210", "98765-43210", "9876543210", "9876543210"];
  const issues = validateBulkStudentRows([
    ...shared.map((parentPhone, index) => row({
      _excelRow: index + 2,
      parentPhone,
      studentId: `S${index + 1}`,
    })),
    row({ _excelRow: 6, parentPhone: "987654321", studentId: "S5" }),
    row({ _excelRow: 7, parentPhone: "+91 9123456789", studentId: "S6" }),
  ]);
  const text = issues.map((issue) => issue.fields.join("; ")).join("\n");
  assert.match(text, /Parent Phone 9876543210 cannot be used more than 3 times/);
  assert.match(text, /Excel rows 2, 3, 4/);
  assert.equal(issues.filter((issue) => issue.fields.some((field) => /10 digit/.test(field))).length, 2);
  assert.deepEqual(issues.map((issue) => issue.rowNumber), [5, 6, 7]);
});

test("every excel rejection is listed as its own reason", () => {
  const lines = formatExcelRejection([
    { rowNumber: 0, fields: ["Required columns missing from the Excel file: Class *."] },
    { rowNumber: 3, fields: ["First Name is required", "Gender must be Male, Female, Other or Not specified"] },
    { rowNumber: 4, fields: ["Parent Phone 9876543210 cannot be used more than 3 times. It also appears on Excel rows 2, 3, 4."] },
  ]);
  assert.deepEqual(lines, [
    "Required columns missing from the Excel file: Class *.",
    "Excel row 3: First Name is required",
    "Excel row 3: Gender must be Male, Female, Other or Not specified",
    "Excel row 4: Parent Phone 9876543210 cannot be used more than 3 times. It also appears on Excel rows 2, 3, 4.",
  ]);
});
