import * as XLSX from "xlsx";

const COLUMN_DEFINITIONS = [
  { header: "Student ID (Optional)", key: "studentId", aliases: ["studentcode", "id", "admissionid"] },
  { header: "First Name *", key: "firstName", aliases: ["firstname"] },
  { header: "Middle Name", key: "middleName", aliases: ["middlename"] },
  { header: "Last Name", key: "lastName", aliases: ["lastname"] },
  { header: "Date of Birth *", key: "dob", aliases: ["dob", "dateofbirth", "birthdate"] },
  { header: "Gender *", key: "gender", aliases: ["sex"] },
  { header: "Academic Year *", key: "academicYear", aliases: ["year"] },
  { header: "Class *", key: "className", aliases: ["class", "grade"] },
  { header: "Section", key: "section", aliases: [] },
  { header: "Enrollment Date", key: "enrollmentDate", aliases: ["enrolleddate"] },
  { header: "Enrollment Number", key: "enrollmentNumber", aliases: ["enrollmentno", "admissionnumber"] },
  { header: "Roll Number", key: "rollNumber", aliases: ["rollno"] },
  { header: "Status (Active/Inactive)", key: "status", aliases: ["studentstatus"] },
  { header: "House", key: "house", aliases: [] },
  { header: "Lunch From School", key: "lunchFromSchool", aliases: [] },
  { header: "Aadhaar Number", key: "aadhaarNumber", aliases: ["aadhar", "aadharnumber"] },
  { header: "Jan Aadhaar Number", key: "janAadhaarNumber", aliases: ["janaadhar", "janaadhaarnumber"] },
  { header: "Scholar Number", key: "scholarNumber", aliases: [] },
  { header: "SSSM ID Number", key: "sssmIdNumber", aliases: ["sssmid"] },
  { header: "Religion", key: "religion", aliases: [] },
  { header: "Category", key: "category", aliases: [] },
  { header: "Caste", key: "caste", aliases: [] },
  { header: "Blood Group", key: "bloodGroup", aliases: [] },
  { header: "Disability", key: "disability", aliases: [] },
  { header: "RTE Student", key: "rteStudent", aliases: ["rte"] },
  { header: "Nationality", key: "nationality", aliases: [] },
  { header: "Admitted Class", key: "admittedClass", aliases: [] },
  { header: "Annual Income", key: "annualIncome", aliases: [] },
  { header: "Is Only Child", key: "onlyChild", aliases: ["isonlychild"] },
  { header: "PEN", key: "pen", aliases: [] },
  { header: "APAAR ID Number", key: "apaarId", aliases: ["apaarid", "apaaridnumber"] },
  { header: "GRN", key: "grn", aliases: [] },
  { header: "Saral ID", key: "saralId", aliases: ["saralid"] },
  { header: "Primary Parent / Relation *", key: "primaryParent", aliases: ["primaryparentrelation", "parentrelation", "relation"] },
  { header: "Login Method (Phone/Email)", key: "loginMethod", aliases: ["parentloginmethod"] },
  { header: "Parent Email (Required for Email login)", key: "parentEmail", aliases: ["parentemailaddress"] },
  { header: "Parent Portal Password *", key: "parentPassword", aliases: ["parentpassword", "password"] },
  { header: "Mother First Name", key: "motherFirst", aliases: ["motherfirstname"] },
  { header: "Mother Middle Name", key: "motherMiddle", aliases: ["mothermiddlename"] },
  { header: "Mother Last Name", key: "motherLast", aliases: ["motherlastname"] },
  { header: "Father First Name", key: "fatherFirst", aliases: ["fatherfirstname"] },
  { header: "Father Middle Name", key: "fatherMiddle", aliases: ["fathermiddlename"] },
  { header: "Father Last Name", key: "fatherLast", aliases: ["fatherlastname"] },
  { header: "Guardian First Name", key: "guardianFirst", aliases: ["guardianfirstname"] },
  { header: "Guardian Middle Name", key: "guardianMiddle", aliases: ["guardianmiddlename"] },
  { header: "Guardian Last Name", key: "guardianLast", aliases: ["guardianlastname"] },
  { header: "Parent Phone *", key: "parentPhone", aliases: ["phone", "motherphone", "primaryparentphone", "contactnumber", "mobile", "mobilenumber"] },
  { header: "Alternate Phone", key: "alternatePhone", aliases: ["alternatecontactnumber"] },
  { header: "Alternate Phone Relation", key: "alternateRelation", aliases: ["alternaterelation"] },
  { header: "Parent / Mother Date of Birth", key: "parentDob", aliases: ["parentdob", "motherdob"] },
  { header: "Street / Address", key: "address", aliases: ["street", "permanentaddress"] },
  { header: "City", key: "city", aliases: [] },
  { header: "State", key: "state", aliases: [] },
  { header: "ZIP / PIN Code", key: "pinCode", aliases: ["zip", "pincode", "postalcode"] },
  { header: "Country", key: "country", aliases: [] },
  { header: "Fee Notes", key: "feeNotes", aliases: [] },
  { header: "Edit Student - Day Care", key: "dayCare", aliases: ["daycare"] },
  { header: "Check In Time", key: "checkInTime", aliases: [] },
  { header: "Check Out Time", key: "checkOutTime", aliases: [] },
  { header: "Allow CCTV", key: "allowCCTV", aliases: [] },
  { header: "Requires Day Care (Admission)", key: "dayCareEnabled", aliases: ["daycareenabled", "requiresdaycare"] },
  { header: "Day Care Start Date", key: "dayCareStartDate", aliases: [] },
  { header: "Day Care Drop-off Time", key: "dayCareDropOffTime", aliases: ["dropofftime"] },
  { header: "Day Care Pickup Time", key: "dayCarePickupTime", aliases: ["pickuptime"] },
  { header: "Authorized Pickup Person", key: "dayCarePickupPerson", aliases: ["authorizedpickupperson"] },
  { header: "Day Care Pickup Phone", key: "dayCarePickupPhone", aliases: ["pickupphone"] },
  { header: "Day Care Notes", key: "dayCareNotes", aliases: [] },
  { header: "In Route (Edit Student)", key: "inRoute", aliases: [] },
  { header: "In Route Stop", key: "inRouteStop", aliases: [] },
  { header: "Out Route", key: "outRoute", aliases: [] },
  { header: "Out Route Stop", key: "outRouteStop", aliases: [] },
  { header: "Requires School Transport (Admission)", key: "transportEnabled", aliases: ["transportenabled", "requirestransport"] },
  { header: "Route Name / Bus Number", key: "routeName", aliases: ["route", "busroute", "busnumber"] },
  { header: "Pickup Stop", key: "pickupStop", aliases: [] },
  { header: "Drop-off Stop", key: "dropStop", aliases: ["dropoffstop"] },
  { header: "Vehicle Number", key: "vehicleNumber", aliases: [] },
  { header: "Transport Start Date", key: "transportStartDate", aliases: [] },
  { header: "Journey Type", key: "journeyType", aliases: [] },
  { header: "Transport Notes", key: "transportNotes", aliases: [] },
  { header: "Edit Student Immunizations JSON (Optional)", key: "editImmunizationsJson", aliases: ["immunizationsjson"] },
  { header: "Admission Immunization Schedule JSON (Optional)", key: "admissionImmunizationJson", aliases: ["immunizationschedulejson"] }
];

export const BULK_STUDENT_EXCEL_HEADERS = COLUMN_DEFINITIONS.map(column => column.header);
const HEADER_TO_FIELD = new Map();
for (const column of COLUMN_DEFINITIONS) {
  HEADER_TO_FIELD.set(normalizeHeader(column.header), column.key);
  for (const alias of column.aliases || []) HEADER_TO_FIELD.set(normalizeHeader(alias), column.key);
}
const REQUIRED_HEADER_KEYS = [
  "firstName", "dob", "gender", "academicYear", "className", "primaryParent",
  "motherFirst", "fatherFirst", "guardianFirst", "parentPhone", "parentPassword", "parentEmail"
];
const DATE_FIELDS = new Set(["dob", "enrollmentDate", "parentDob", "dayCareStartDate", "transportStartDate"]);

function normalizeHeader(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}
function datePartsToIso(year, month, day) {
  const y = Number(year), m = Number(month), d = Number(day);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const test = new Date(y, m - 1, d);
  if (test.getFullYear() !== y || test.getMonth() !== m - 1 || test.getDate() !== d) return "";
  return String(y).padStart(4, "0") + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}
function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return String(value.getFullYear()) + "-" + String(value.getMonth() + 1).padStart(2, "0") + "-" + String(value.getDate()).padStart(2, "0");
  }
  if (typeof value === "number" && value > 10000 && value < 100000) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return datePartsToIso(parsed.y, parsed.m, parsed.d);
  }
  const source = String(value ?? "").trim();
  if (!source) return "";
  let match = source.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) return datePartsToIso(match[1], match[2], match[3]) || source;
  match = source.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (match) return datePartsToIso(match[3], match[2], match[1]) || source;
  const parsed = new Date(source);
  if (!Number.isNaN(parsed.getTime())) {
    return String(parsed.getFullYear()) + "-" + String(parsed.getMonth() + 1).padStart(2, "0") + "-" + String(parsed.getDate()).padStart(2, "0");
  }
  return source;
}
function valueText(value, key) {
  if (value === undefined || value === null) return "";
  if (DATE_FIELDS.has(key)) return normalizeDate(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value).replace(/\.0$/, "");
  return String(value).trim();
}
function isValidIsoDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return Boolean(match && datePartsToIso(match[1], match[2], match[3]));
}
function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}
function fullName(row, prefix) {
  const fields = prefix
    ? [row[prefix + "First"], row[prefix + "Middle"], row[prefix + "Last"]]
    : [row.firstName, row.middleName, row.lastName];
  return fields.map(value => String(value || "").trim()).filter(Boolean).join(" ");
}
function canonicalRelation(value) {
  const s = String(value || "").trim().toLowerCase();
  if (s === "mother") return "Mother";
  if (s === "father") return "Father";
  if (s === "guardian") return "Guardian";
  return "";
}
function normalizeYesNo(value, fallback = "No") {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return fallback;
  if (["yes", "y", "true", "1"].includes(v)) return "Yes";
  if (["no", "n", "false", "0"].includes(v)) return "No";
  return String(value).trim();
}
function parseJsonArray(value, fieldLabel, rowNumber, issues) {
  if (isBlank(value)) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) throw new Error("must be a JSON array");
    return parsed;
  } catch {
    issues.push({ rowNumber, fields: [fieldLabel + " must contain valid JSON in array format"] });
    return [];
  }
}

export function downloadBulkStudentExcelTemplate() {
  const workbook = XLSX.utils.book_new();
  const studentsSheet = XLSX.utils.aoa_to_sheet([BULK_STUDENT_EXCEL_HEADERS]);
  studentsSheet["!cols"] = BULK_STUDENT_EXCEL_HEADERS.map(header => ({ wch: Math.min(30, Math.max(16, header.length + 2)) }));
  studentsSheet["!autofilter"] = { ref: "A1:" + XLSX.utils.encode_col(BULK_STUDENT_EXCEL_HEADERS.length - 1) + "1" };
  XLSX.utils.book_append_sheet(workbook, studentsSheet, "Students");

  const instructions = [
    ["School World - Bulk Student Upload"],
    ["Use one row per student on the Students sheet. Keep the column headers unchanged."],
    ["All rows are validated before any database write. If any required field is missing or invalid, the entire upload is rejected."],
    ["Required for every row: First Name, Date of Birth, Gender, Academic Year, Class, Primary Parent / Relation, Parent Phone, Parent Portal Password."],
    ["Primary Parent / Relation must be Mother, Father or Guardian. The corresponding Mother/Father/Guardian First Name must also be filled."],
    ["Parent Phone must contain at least 7 digits. Parent Portal Password must be at least 6 characters."],
    ["If Login Method is Email, Parent Email is required and must be valid. If blank, Login Method defaults to Phone."],
    ["Dates: use YYYY-MM-DD, for example 2018-04-21. Gender: Male, Female, Other or Not specified."],
    ["Student ID is optional and will be generated if left blank. If you enter an existing Student ID, that record will be updated."],
    ["Parent passwords are used to create a new parent login and are never saved as plain text. Existing parent portal passwords are retained."],
    ["Optional fields: leave blank when not applicable. Day care and transport options default to No when blank."],
    ["Edit Student Immunizations JSON example: [{\"name\":\"Polio\",\"scheduleDate\":\"2026-11-20\",\"administeredDate\":\"\",\"remarks\":\"\",\"status\":\"Pending\",\"image\":\"\"}]"],
    ["Admission Immunization Schedule JSON example: [{\"vaccine\":\"Polio\",\"dueDate\":\"2026-11-20\",\"administeredDate\":\"\",\"notes\":\"\",\"status\":\"Pending\",\"image\":\"\"}]"],
    ["Store phone numbers, IDs and passwords as Excel Text to preserve leading zeros."],
    ["Do not include photos as data URLs in this workbook. Upload student photos from Edit Student after importing."]
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet["!cols"] = [{ wch: 125 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
  XLSX.writeFile(workbook, "school-world-bulk-students-template.xlsx", { bookType: "xlsx" });
}

export function parseBulkStudentWorkbook(arrayBuffer) {
  let workbook;
  try {
    workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  } catch {
    return { rows: [], fileErrors: ["The selected file could not be read as an Excel workbook. Please use the downloaded .xlsx template."] };
  }
  const sheetName = workbook.SheetNames?.[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;
  if (!sheet) return { rows: [], fileErrors: ["The Excel workbook has no Students worksheet. Please use the downloaded template."] };

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "", blankrows: true });
  if (!matrix.length || !matrix[0]?.some(value => !isBlank(value))) {
    return { rows: [], fileErrors: ["The Students worksheet must contain the required column headers in row 1."] };
  }
  const headers = matrix[0].map(value => String(value ?? "").trim());
  const fieldIndexes = new Map();
  const duplicateFields = new Set();
  headers.forEach((header, index) => {
    const field = HEADER_TO_FIELD.get(normalizeHeader(header));
    if (!field) return;
    if (fieldIndexes.has(field)) duplicateFields.add(field);
    else fieldIndexes.set(field, index);
  });
  const fileErrors = [];
  if (duplicateFields.size) {
    const duplicateLabels = Array.from(duplicateFields).map(field => COLUMN_DEFINITIONS.find(column => column.key === field)?.header || field);
    fileErrors.push("Duplicate columns found: " + duplicateLabels.join(", ") + ". Keep only one column for each field.");
  }
  const missingHeaders = REQUIRED_HEADER_KEYS.filter(key => !fieldIndexes.has(key));
  if (missingHeaders.length) {
    fileErrors.push("Required columns missing from the Excel file: " + missingHeaders.map(key => COLUMN_DEFINITIONS.find(column => column.key === key)?.header || key).join(", ") + ".");
  }
  if (fileErrors.length) return { rows: [], fileErrors };

  const rows = [];
  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex++) {
    const cells = matrix[rowIndex] || [];
    if (!cells.some(value => !isBlank(value))) continue;
    const row = { _excelRow: rowIndex + 1 };
    for (const [field, columnIndex] of fieldIndexes) row[field] = valueText(cells[columnIndex], field);
    for (const column of COLUMN_DEFINITIONS) if (row[column.key] === undefined) row[column.key] = "";
    if (!isBlank(row.studentId)) row.studentId = String(row.studentId).trim();
    rows.push(row);
  }
  if (!rows.length) return { rows: [], fileErrors: ["No student rows found. Enter at least one student below the header row."] };
  if (rows.length > 2000) return { rows: [], fileErrors: ["A maximum of 2,000 students can be uploaded at one time. Split the workbook into smaller files."] };
  return { rows, fileErrors: [] };
}

export function validateBulkStudentRows(rows) {
  const issues = [];
  const seenIds = new Map();
  rows.forEach((row, index) => {
    const rowNumber = Number(row._excelRow) || index + 2;
    const fields = [];
    const add = label => { if (!fields.includes(label)) fields.push(label); };
    if (isBlank(row.firstName)) add("First Name is required");
    if (isBlank(row.dob)) add("Date of Birth is required");
    else if (!isValidIsoDate(row.dob)) add("Date of Birth must be a valid date in YYYY-MM-DD format");
    if (isBlank(row.gender)) add("Gender is required");
    else if (!["male", "female", "other", "not specified"].includes(String(row.gender).trim().toLowerCase())) add("Gender must be Male, Female, Other or Not specified");
    if (isBlank(row.academicYear)) add("Academic Year is required");
    if (isBlank(row.className)) add("Class is required");
    const relation = canonicalRelation(row.primaryParent);
    if (!relation) add("Primary Parent / Relation must be Mother, Father or Guardian");
    if (isBlank(row.parentPhone)) add("Parent Phone is required");
    else if (String(row.parentPhone).replace(/\D/g, "").length < 7) add("Parent Phone must contain at least 7 digits");
    if (isBlank(row.parentPassword)) add("Parent Portal Password is required");
    else if (String(row.parentPassword).length < 6) add("Parent Portal Password must contain at least 6 characters");
    if (relation === "Mother" && isBlank(row.motherFirst)) add("Mother First Name is required when Primary Parent / Relation is Mother");
    if (relation === "Father" && isBlank(row.fatherFirst)) add("Father First Name is required when Primary Parent / Relation is Father");
    if (relation === "Guardian" && isBlank(row.guardianFirst)) add("Guardian First Name is required when Primary Parent / Relation is Guardian");

    const loginMethod = String(row.loginMethod || "Phone").trim().toLowerCase();
    if (!isBlank(row.loginMethod) && !["phone", "email"].includes(loginMethod)) add("Login Method must be Phone or Email");
    if (loginMethod === "email") {
      if (isBlank(row.parentEmail)) add("Parent Email is required when Login Method is Email");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.parentEmail).trim())) add("Parent Email must be a valid email address");
    } else if (!isBlank(row.parentEmail) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.parentEmail).trim())) {
      add("Parent Email must be a valid email address when provided");
    }
    if (!isBlank(row.enrollmentDate) && !isValidIsoDate(row.enrollmentDate)) add("Enrollment Date must be a valid date");
    if (!isBlank(row.parentDob) && !isValidIsoDate(row.parentDob)) add("Parent / Mother Date of Birth must be a valid date");
    if (!isBlank(row.dayCareStartDate) && !isValidIsoDate(row.dayCareStartDate)) add("Day Care Start Date must be a valid date");
    if (!isBlank(row.transportStartDate) && !isValidIsoDate(row.transportStartDate)) add("Transport Start Date must be a valid date");
    if (!isBlank(row.studentId)) {
      const normalizedId = String(row.studentId).trim().toLowerCase();
      if (seenIds.has(normalizedId)) add("Student ID duplicates Excel row " + seenIds.get(normalizedId));
      else seenIds.set(normalizedId, rowNumber);
    }
    parseJsonArray(row.editImmunizationsJson, "Edit Student Immunizations JSON", rowNumber, issues);
    parseJsonArray(row.admissionImmunizationJson, "Admission Immunization Schedule JSON", rowNumber, issues);
    if (fields.length) issues.push({ rowNumber, fields });
  });
  return issues;
}

export function buildBulkStudentImportPayload(rows) {
  const additionalIssues = [];
  const payloads = rows.map((row, index) => {
    const rowNumber = Number(row._excelRow) || index + 2;
    const relation = canonicalRelation(row.primaryParent);
    const chosenParentName = relation === "Mother" ? fullName(row, "mother")
      : relation === "Father" ? fullName(row, "father")
      : relation === "Guardian" ? fullName(row, "guardian") : "";
    const name = fullName(row, "");
    const generatedCode = globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + "-" + index + "-" + Math.random().toString(36).slice(2, 8));
    const studentCode = String(row.studentId || "").trim() || ("SW-" + generatedCode.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18).toUpperCase());
    const parentEmail = String(row.parentEmail || "").trim().toLowerCase();
    const loginMethod = String(row.loginMethod || "Phone").trim().toLowerCase() === "email" ? "Email" : "Phone";
    const editImmunizations = parseJsonArray(row.editImmunizationsJson, "Edit Student Immunizations JSON", rowNumber, additionalIssues);
    const admissionImmunizations = parseJsonArray(row.admissionImmunizationJson, "Admission Immunization Schedule JSON", rowNumber, additionalIssues);
    const dayCare = normalizeYesNo(row.dayCare || row.dayCareEnabled, "No");
    const transportEnabled = normalizeYesNo(row.transportEnabled, "No");
    const routeName = String(row.routeName || row.inRoute || row.outRoute || "").trim();
    const studentDetails = {
      firstName: row.firstName, middleName: row.middleName, lastName: row.lastName,
      dob: row.dob, gender: row.gender, academicYear: row.academicYear, className: row.className,
      section: row.section, enrollmentDate: row.enrollmentDate, enrollmentNo: row.enrollmentNumber,
      rollNumber: row.rollNumber, house: row.house, lunchFromSchool: normalizeYesNo(row.lunchFromSchool, "No"),
      aadhar: row.aadhaarNumber, janAadhar: row.janAadhaarNumber, scholarNumber: row.scholarNumber,
      sssmId: row.sssmIdNumber, religion: row.religion, category: row.category || "",
      caste: row.caste, bloodGroup: row.bloodGroup, disability: row.disability,
      rteStudent: normalizeYesNo(row.rteStudent, "No"), nationality: row.nationality || "",
      admittedClass: row.admittedClass, annualIncome: row.annualIncome, onlyChild: normalizeYesNo(row.onlyChild, "No"),
      pen: row.pen, apaarId: row.apaarId, grn: row.grn, saralId: row.saralId,
      loginMethod, email: parentEmail, primaryParent: relation,
      motherFirst: row.motherFirst, motherMiddle: row.motherMiddle, motherLast: row.motherLast,
      fatherFirst: row.fatherFirst, fatherMiddle: row.fatherMiddle, fatherLast: row.fatherLast,
      guardianFirst: row.guardianFirst, guardianMiddle: row.guardianMiddle, guardianLast: row.guardianLast,
      motherPhone: row.parentPhone, alternatePhone: row.alternatePhone,
      alternateRelation: row.alternateRelation, motherDob: row.parentDob,
      address: row.address, city: row.city, state: row.state, zip: row.pinCode, country: row.country || "India",
      feeTotal: "", feePaid: "", feeUnpaid: "", feeNotes: row.feeNotes || "",
      dayCare, checkInTime: row.checkInTime, checkOutTime: row.checkOutTime,
      allowCCTV: normalizeYesNo(row.allowCCTV, "No"),
      inRoute: row.inRoute || routeName, inRouteStop: row.inRouteStop || row.pickupStop,
      outRoute: row.outRoute || routeName, outRouteStop: row.outRouteStop || row.dropStop,
      immunizations: editImmunizations,
      admitNewStudent: {
        student: {
          firstName: row.firstName, middleName: row.middleName, lastName: row.lastName,
          dob: row.dob, gender: row.gender, academicYear: row.academicYear, className: row.className,
          section: row.section, enrollmentDate: row.enrollmentDate, enrollmentNumber: row.enrollmentNumber,
          rollNumber: row.rollNumber, house: row.house, lunchFromSchool: normalizeYesNo(row.lunchFromSchool, "No"),
          aadhaarNumber: row.aadhaarNumber, janAadhaarNumber: row.janAadhaarNumber,
          scholarNumber: row.scholarNumber, sssmIdNumber: row.sssmIdNumber, religion: row.religion,
          category: row.category || "", caste: row.caste, bloodGroup: row.bloodGroup,
          disability: row.disability || "None selected", rteStudent: normalizeYesNo(row.rteStudent, "No"),
          nationality: row.nationality || "", admittedClass: row.admittedClass,
          annualIncome: row.annualIncome, isOnlyChild: normalizeYesNo(row.onlyChild, "No"),
          pen: row.pen, apaarIdNumber: row.apaarId, grn: row.grn, saralId: row.saralId
        },
        parent: {
          loginMethod, email: parentEmail, relation,
          motherFirst: row.motherFirst, motherMiddle: row.motherMiddle, motherLast: row.motherLast,
          fatherFirst: row.fatherFirst, fatherMiddle: row.fatherMiddle, fatherLast: row.fatherLast,
          guardianFirst: row.guardianFirst, guardianMiddle: row.guardianMiddle, guardianLast: row.guardianLast,
          phone: row.parentPhone, alternatePhone: row.alternatePhone, alternatePhoneRelation: row.alternateRelation,
          dob: row.parentDob, address: row.address, city: row.city, state: row.state,
          zip: row.pinCode, country: row.country || "India"
        },
        fees: { templateId: "", applyTemplate: false, notes: row.feeNotes || "" },
        dayCare: {
          enabled: normalizeYesNo(row.dayCareEnabled, "No"), startDate: row.dayCareStartDate,
          dropOffTime: row.dayCareDropOffTime, pickupTime: row.dayCarePickupTime,
          pickupPerson: row.dayCarePickupPerson, pickupPhone: row.dayCarePickupPhone, notes: row.dayCareNotes
        },
        transport: {
          enabled: transportEnabled, routeName, pickupStop: row.pickupStop, dropStop: row.dropStop,
          vehicleNumber: row.vehicleNumber, startDate: row.transportStartDate,
          journeyType: row.journeyType || "Both Ways", notes: row.transportNotes
        },
        immunizationSchedule: admissionImmunizations
      }
    };
    return {
      sourceRowNumber: rowNumber,
      importSource: "excel-bulk-import",
      studentId: studentCode,
      name,
      className: row.className,
      section: row.section,
      academicYear: row.academicYear,
      originalClass: row.className,
      dob: row.dob,
      gender: row.gender,
      father: fullName(row, "father"),
      parent: chosenParentName,
      motherName: fullName(row, "mother"),
      primaryParentName: chosenParentName,
      primaryParent: relation,
      parentEmail,
      parentPassword: row.parentPassword,
      parentLoginMethod: loginMethod,
      phone: row.parentPhone,
      parentPhone: row.parentPhone,
      alternatePhone: row.alternatePhone,
      email: parentEmail,
      address: row.address,
      city: row.city,
      state: row.state,
      pinCode: row.pinCode,
      bloodGroup: row.bloodGroup,
      category: row.category || "",
      nationality: row.nationality || "",
      house: row.house,
      enrollmentDate: row.enrollmentDate,
      enrollmentNumber: row.enrollmentNumber || "",
      rollNumber: row.rollNumber,
      status: row.status || "Active",
      enrolled: "Yes",
      routeName,
      dayCare: dayCare === "Yes",
      details: studentDetails
    };
  });
  return { payloads, issues: additionalIssues };
}
