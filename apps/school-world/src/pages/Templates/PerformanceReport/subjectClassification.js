const normalize = value => String(value == null ? "" : value).trim().replace(/\s+/g, " ").toLocaleLowerCase();

function signature(record) {
  return (Array.isArray(record?.subjectMappings) ? record.subjectMappings : [])
    .filter(item => item && item.enabled !== false)
    .map(item => [normalize(item.subjectName), Boolean(item.optional), Boolean(item.extraCurricular), Boolean(item.packageSubject), Boolean(item.language)].join(":"))
    .sort().join("|");
}
export function findClassRecord(className, classRecords = []) {
  const wanted = normalize(className);
  if (!wanted) return null;
  const records = (Array.isArray(classRecords) ? classRecords : []).filter(item => item && item.status !== "Inactive");
  const exact = records.filter(item => normalize(item.displayName) === wanted ||
    normalize([item.name, item.section].map(v => String(v || "").trim()).filter(Boolean).join(" ")) === wanted);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return exact.every(item => signature(item) === signature(exact[0])) ? exact[0] : null;
  const byName = records.filter(item => normalize(item.name) === wanted);
  if (byName.length === 1) return byName[0];
  if (byName.length > 1 && byName.every(item => signature(item) === signature(byName[0]))) return byName[0];
  return null;
}
export function getClassSubjectClassification(className, subjectName, classRecords = []) {
  const record = findClassRecord(className, classRecords), subject = normalize(subjectName);
  const mapping = (Array.isArray(record?.subjectMappings) ? record.subjectMappings : [])
    .find(item => item && item.enabled !== false && normalize(item.subjectName) === subject);
  if (!mapping) return {type:"Not mapped",isOptional:false,isMapped:false,classRecord:record,mapping:null};
  const isOptional = Boolean(mapping.optional);
  return {type:isOptional?"Optional":"Primary / Compulsory",isOptional,isMapped:true,classRecord:record,mapping};
}
export function getClassSubjectOptions(className, subjects = [], classRecords = []) {
  const record = findClassRecord(className, classRecords);
  const allSubjects = (Array.isArray(subjects) ? subjects : []).filter(Boolean);
  const catalog = allSubjects
    .filter(item => normalize(item.name) && String(item.status || "Active").toLowerCase() !== "inactive");
  const mappings = (Array.isArray(record?.subjectMappings) ? record.subjectMappings : [])
    .filter(item => item && item.enabled !== false && normalize(item.subjectName));
  if (record && mappings.length) return mappings.flatMap(mapping => {
    const matches = item => (mapping.subjectId && String(item.id) === String(mapping.subjectId)) ||
      normalize(item.name) === normalize(mapping.subjectName);
    const original = allSubjects.find(matches);
    if (original && String(original.status || "Active").toLowerCase() === "inactive") return [];
    const subject = catalog.find(matches);
    return [{
      ...(subject || {}),
      id: String(mapping.subjectId || subject?.id || ""),
      name: String(mapping.subjectName || subject?.name || "").trim(),
      code: String(subject?.code || ""),
      optional: Boolean(mapping.optional),
      mapped: true
    }];
  });
  return catalog.map(item => ({ ...item, optional: false, mapped: false }));
}
function empty(){return {obtained:0,maximum:0,count:0,percentage:null};}
export function summarizeSubjectPerformance(scores=[],examsById={},classRecords=[]) {
  const result={primary:empty(),optional:empty(),unmapped:empty()};
  for(const score of scores){
    const exam=examsById[String(score?.examId)];if(!exam)continue;
    const classification=getClassSubjectClassification(exam.className,exam.subjectName,classRecords);
    const bucket=classification.isOptional?result.optional:classification.isMapped?result.primary:result.unmapped;
    const mark=Number(score.marksObtained||0),maximum=Number(exam.maxMarks||0);
    bucket.obtained+=Number.isFinite(mark)?mark:0;bucket.maximum+=Number.isFinite(maximum)?maximum:0;bucket.count++;
  }
  Object.values(result).forEach(bucket=>{bucket.percentage=bucket.count>0&&bucket.maximum>0?bucket.obtained/bucket.maximum*100:null;});
  return result;
}
