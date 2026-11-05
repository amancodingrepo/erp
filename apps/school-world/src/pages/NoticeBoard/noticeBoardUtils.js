export function currentAcademicYear(date = new Date()) {
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${start}-${start + 1}`;
}

export function defaultClassTargets() {
  const sections = ["A", "B", "C", "D", "E", "F", "G"];
  const levels = ["PRE NURSERY", "NURSERY", "KG I", "KG II"];
  for (let grade = 1; grade <= 10; grade += 1) levels.push(String(grade));
  for (const grade of [11, 12]) levels.push(`${grade} SCIENCE`, `${grade} COMMERCE`, `${grade} HUMANITIES`);
  return levels.flatMap(level => sections.map(section => `${level} (${section})`));
}

export function normalizeClassName(input) {
  const raw = String(input || "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  const early = raw.match(/^(PRE\s*NURSERY|NURSERY|KG\s*I{1,2}|LKG|UKG)\s*\(?\s*([A-G])\s*\)?$/i);
  if (early) {
    let level = early[1].toUpperCase().replace(/\s+/g, " ");
    if (level === "LKG") level = "KG I";
    if (level === "UKG") level = "KG II";
    return `${level} (${early[2].toUpperCase()})`;
  }
  const regular = raw.match(/^(?:CLASS\s*)?(\d{1,2}|I{1,3}|IV|V|VI|VII|VIII|IX|X|XI|XII)(?:\s+(SCIENCE|COMMERCE|HUMANITIES))?\s*\(?\s*([A-G])\s*\)?$/i);
  if (regular) {
    const roman = { I: "1", II: "2", III: "3", IV: "4", V: "5", VI: "6", VII: "7", VIII: "8", IX: "9", X: "10", XI: "11", XII: "12" };
    const grade = roman[regular[1].toUpperCase()] || regular[1];
    const stream = regular[2] ? ` ${regular[2].toUpperCase()}` : "";
    return `${grade}${stream} (${regular[3].toUpperCase()})`;
  }
  return raw;
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl: String(reader.result || "") });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function normalizeRecipient(person = {}, fallbackRole = "User") {
  const rawRole = person.role || person.userType || person.accountType || person.type || fallbackRole;
  const role = String(rawRole || "User").trim();
  const combinedName = [person.firstName || person.givenName, person.middleName, person.lastName || person.surname].filter(Boolean).join(" ").trim();
  const fullName = String(person.fullName || person.name || person.displayName || person.title || combinedName || "").trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = String(person.firstName || person.givenName || parts[0] || "").trim();
  const lastName = String(person.lastName || person.surname || (parts.length > 1 ? parts.slice(1).join(" ") : "")).trim();
  const rawId = person.userId ?? person.user_id ?? person.id ?? person.studentId ?? person.studentID ?? person.employeeId ?? person.staffId ?? person.teacherId ?? person.enrollmentNumber ?? person.email ?? person.phone ?? `${role}:${fullName}`;
  const className = person.className || person.class || person.assignedClass || person.grade || "";
  return {
    userId: String(rawId ?? ""),
    studentId: String(person.studentId ?? person.studentID ?? ((/student/i.test(role)) ? (person.id ?? person.enrollmentNumber ?? "") : "")),
    firstName,
    lastName,
    fullName: fullName || [firstName, lastName].filter(Boolean).join(" "),
    userType: role,
    className: String(className || ""),
    section: String(person.section || person.classSection || ""),
    rollNumber: String(person.rollNumber || person.rollNo || ""),
    enrollmentNumber: String(person.enrollmentNumber || person.enrollmentNo || person.admissionNumber || ""),
    contactNumber: String(person.contactNumber || person.mobileNumber || person.mobile || person.phone || person.parentPhone || person.phoneNumber || ""),
    alternateContactNumber: String(person.alternateContact || person.alternatePhone || person.secondaryPhone || ""),
    parentGuardianName: String(person.parentGuardianName || person.parentName || person.parent || person.father || person.fatherName || person.motherName || person.primaryParentName || ""),
    email: String(person.email || person.emailAddress || ""),
    gender: String(person.gender || ""),
    dateOfBirth: String(person.dob || person.dateOfBirth || person.birthDate || ""),
    address: String(person.address || person.permanentAddress || ""),
    city: String(person.city || ""),
    state: String(person.state || ""),
    status: String(person.status || person.accountStatus || "Active"),
    lastSeen: String(person.lastSeen || person.lastLogin || ""),
    routeName: String(person.routeName || person.route || person.busRoute || person.busNumber || person.transportRoute || ""),
    raw: person,
  };
}

export function recipientKey(person) {
  return String(person?.userId || person?.studentId || person?.email || person?.contactNumber || person?.fullName || "");
}

export function sameRecipient(left, right) {
  if (!left || !right) return false;
  const leftUser = String(left.userId || "");
  const rightUser = String(right.userId || "");
  if (leftUser && rightUser && leftUser === rightUser) return true;
  const leftStudent = String(left.studentId || "");
  const rightStudent = String(right.studentId || "");
  if (leftStudent && rightStudent && leftStudent === rightStudent) return true;
  if (leftUser && rightStudent && leftUser === rightStudent) return true;
  if (rightUser && leftStudent && rightUser === leftStudent) return true;
  const leftEmail = String(left.email || "").toLowerCase();
  const rightEmail = String(right.email || "").toLowerCase();
  return Boolean(leftEmail && rightEmail && leftEmail === rightEmail);
}

export function isActiveRecipient(person) {
  const status = String(person?.status || person?.accountStatus || "Active").toLowerCase();
  return status !== "inactive" && status !== "deactivated" && person?.childId !== false && String(person?.childId).toLowerCase() !== "false";
}

export function enabledFlag(value) {
  return value === true || value === 1 || ["yes", "true", "1", "active", "enrolled", "enabled"].includes(String(value || "").toLowerCase());
}

export function viewRowsFromRecords(records) {
  return Array.isArray(records) ? records : [];
}

export function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatNoticeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return date.toLocaleString("en-US", { weekday: "long", month: "long", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
