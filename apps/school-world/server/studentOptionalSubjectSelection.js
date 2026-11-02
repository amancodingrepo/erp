export function parseOptionalSubjectSelectionInput(body, isUuid) {
  const classId = String(body?.classId ?? "").trim();
  const academicYear = String(body?.academicYear ?? "").trim();
  const rawIds = body?.subjectIds;
  if (!classId || !isUuid(classId)) return { ok: false, message: "Choose a valid configured class." };
  if (!academicYear || academicYear.length > 32) return { ok: false, message: "Academic year is required and must be 32 characters or fewer." };
  if (!Array.isArray(rawIds) || rawIds.length > 40) return { ok: false, message: "Submit a list of up to 40 optional subject IDs." };
  const subjectIds = [...new Set(rawIds.map(value => String(value ?? "").trim()))];
  if (subjectIds.some(id => !id || !isUuid(id))) return { ok: false, message: "One or more optional subject IDs are invalid." };
  return { ok: true, value: { classId, academicYear, subjectIds } };
}
export function selectionContainsOnlyAllowedSubjects(subjectIds, allowedSubjectIds) {
  const allowed = allowedSubjectIds instanceof Set ? allowedSubjectIds : new Set(allowedSubjectIds || []);
  return Array.isArray(subjectIds) && subjectIds.every(id => allowed.has(String(id)));
}

// Keep the existing student-code key for the report roster while carrying the
// UUID primary key needed by relational student-subject selection records.
export function mapOptionalSubjectRosterStudent(student, databaseStudentId, selectedSubjectIds = []) {
  const code = String(student?.studentCode ?? student?.studentId ?? student?.id ?? "").trim();
  return {
    id: code,
    studentDbId: String(databaseStudentId ?? student?.studentDbId ?? "").trim(),
    studentCode: code,
    name: String(student?.name ?? ""),
    rollNumber: String(student?.rollNumber ?? ""),
    className: String(student?.className ?? ""),
    section: String(student?.section ?? ""),
    academicYear: String(student?.academicYear ?? ""),
    selectedSubjectIds: [...new Set(
      (Array.isArray(selectedSubjectIds) ? selectedSubjectIds : [])
        .map(value => String(value ?? "").trim())
        .filter(Boolean)
    )]
  };
}
