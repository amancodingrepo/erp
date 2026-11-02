export function studentOptionalSubjectContextKey(classId, academicYear) {
  return String(classId ?? "").trim() + "::" + String(academicYear ?? "").trim();
}
export function normalizeSelectedOptionalSubjectIds(values, allowedSubjectIds = []) {
  const allowed = new Set((Array.isArray(allowedSubjectIds) ? allowedSubjectIds : []).map(value => String(value)));
  return [...new Set((Array.isArray(values) ? values : []).map(value => String(value ?? "").trim()).filter(value => value && allowed.has(value)))];
}
export function toggleOptionalSubjectSelection(currentValues, subjectId, checked, allowedSubjectIds = []) {
  const current = new Set(normalizeSelectedOptionalSubjectIds(currentValues, allowedSubjectIds));
  const id = String(subjectId ?? "").trim();
  const allowed = new Set((Array.isArray(allowedSubjectIds) ? allowedSubjectIds : []).map(value => String(value)));
  if (!id || !allowed.has(id)) return [...current];
  if (checked) current.add(id); else current.delete(id);
  return [...current];
}

export function persistentStudentDbId(student) {
  return String(student?.studentDbId ?? "").trim();
}
