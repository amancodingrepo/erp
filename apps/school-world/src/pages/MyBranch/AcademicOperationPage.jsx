import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, RefreshCw, Save, Search, Plus, AlignJustify,
  Trash2, Pencil, Users, BookOpen, GraduationCap, Building2, ClipboardList,
  AlertCircle, CheckSquare, Square
} from "lucide-react";
import { apiGet, apiPost, apiPatch, apiPut } from "../../api.js";
import "./AcademicOperationPage.css";

const clean = value => String(value ?? "").trim().replace(/\s+/g, " ");
const ROLL_SORT_OPTIONS = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "gender", label: "Gender" },
  { value: "rollNumber", label: "Roll Number" }
];
function studentNameParts(student) {
  const full = clean(student?.name || student?.fullName || student?.full_name);
  const pieces = full.split(/\s+/).filter(Boolean);
  return {
    full,
    first: clean(student?.firstName || student?.first_name || pieces[0] || ""),
    last: clean(student?.lastName || student?.last_name || pieces.slice(1).join(" "))
  };
}
function genderSortRank(value) {
  const gender = clean(value).toLowerCase();
  if (gender === "female" || gender === "f") return 0;
  if (gender === "male" || gender === "m") return 1;
  if (gender === "other" || gender === "non-binary" || gender === "nonbinary") return 2;
  if (gender === "not specified" || gender === "unspecified") return 3;
  return 4;
}
function compareStudentSort(a, b, field) {
  if (field === "gender") return genderSortRank(a?.gender) - genderSortRank(b?.gender);
  if (field === "rollNumber") {
    const left = clean(a?.rollNumber), right = clean(b?.rollNumber);
    if (/^\d+(?:\.\d+)?$/.test(left) && /^\d+(?:\.\d+)?$/.test(right)) {
      const delta = Number(left) - Number(right);
      if (delta) return delta;
    }
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  }
  const leftParts = studentNameParts(a), rightParts = studentNameParts(b);
  const left = field === "lastName" ? leftParts.last : leftParts.first;
  const right = field === "lastName" ? rightParts.last : rightParts.first;
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}
function compareRollOrder(a, b, primary, secondary) {
  for (const field of Array.from(new Set([primary, secondary].filter(Boolean)))) {
    const difference = compareStudentSort(a, b, field);
    if (difference) return difference;
  }
  const nameDifference = studentNameParts(a).full.localeCompare(studentNameParts(b).full, undefined, { numeric: true, sensitivity: "base" });
  return nameDifference || clean(a?.id || a?.studentId).localeCompare(clean(b?.id || b?.studentId), undefined, { numeric: true });
}
const makeId = prefix => prefix + "-" + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8));
const MODULE_KEYS = {
  "Manage Marks Percentage for Leave Type": "leave-marks-percentage",
  "Manage House": "houses",
  "Manage Class Eligibility Criteria": "class-eligibility-criteria"
};
const LEAVE_TYPE_OPTIONS = [
  "Medical Leave",
  "Tournament Leave",
  "Not Applicable",
  "Not Present",
  "Special Leave",
  "dash"
];

function classLabel(item) {
  const displayName=clean(item.displayName);
  if(displayName) return displayName;
  const name=clean(item.name || item.className);
  const section=clean(item.section);
  return section ? name + " (" + section + ")" : name;
}
function classParts(name, section) {
  let normalizedName = clean(name);
  let normalizedSection = clean(section);
  if (!normalizedSection) {
    const match = normalizedName.match(/^(.*?)\\s+\\(([^()]+)\\)$/);
    if (match && !/^\\d{2,4}[-/]\\d{2,4}$/.test(clean(match[2]))) {
      normalizedName = clean(match[1]);
      normalizedSection = clean(match[2]);
    }
  }
  return { name: normalizedName, section: normalizedSection };
}
function classKey(name, section) {
  const parts = classParts(name, section);
  return parts.name.toLocaleLowerCase() + "::" + parts.section.toLocaleLowerCase();
}
function classFilterParts(name, section) {
  let normalizedName = clean(name);
  const normalizedSection = clean(section);
  if (normalizedSection) {
    const lowerName = normalizedName.toLocaleLowerCase();
    const suffixes = [
      " (" + normalizedSection + ")",
      " - " + normalizedSection,
      " – " + normalizedSection,
      " — " + normalizedSection,
      " " + normalizedSection
    ];
    const matchingSuffix = suffixes.find(suffix => lowerName.endsWith(suffix.toLocaleLowerCase()));
    if (matchingSuffix) normalizedName = clean(normalizedName.slice(0, -matchingSuffix.length));
  }
  return { name: normalizedName, section: normalizedSection };
}
function studentClassFilterKey(student) {
  const parts = classFilterParts(student.className, student.section);
  return classKey(parts.name, parts.section);
}
function groupLabel(name, section) {
  const parts = classParts(name, section);
  return parts.section ? parts.name + " (" + parts.section + ")" : parts.name;
}

function eligibilityGradeLabel(item) {
  const parts = classParts(item.name || item.className || item.displayName, item.section);
  let name = clean(parts.name).replace(/\\s*\\([^)]*\\)\\s*$/, "").trim();
  const prefixed = name.match(/^(?:class|grade|std\\.?|standard)\\s+(.+)$/i);
  const grade = clean(prefixed ? prefixed[1] : name).toLowerCase().replace(/[.]/g, "");
  const ordinal = grade.match(/^(\\d+)(?:st|nd|rd|th)?$/);
  if (ordinal) return "Class " + Number(ordinal[1]);
  const roman = {i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9, x:10, xi:11, xii:12};
  if (Object.prototype.hasOwnProperty.call(roman, grade)) return "Class " + roman[grade];
  if (/^(nursery|lkg|ukg|pre[- ]?nursery|play ?group|junior kg|senior kg)$/.test(grade)) {
    return grade.toUpperCase() === "LKG" || grade.toUpperCase() === "UKG" ? grade.toUpperCase() : name;
  }
  return name;
}

function studentIsActive(student) {
  return clean(student.status).toLocaleLowerCase() !== "inactive" && student.alumni !== true;
}
function nextAcademicYearLabel(label) {
  const value = clean(label);
  const range = value.match(/^(\\d{4})\\s*([-\\/])\\s*(\\d{2}|\\d{4})$/);
  if (range) {
    const first = Number(range[1]);
    let end = range[3].length === 2 ? Math.floor(first / 100) * 100 + Number(range[3]) : Number(range[3]);
    if (end < first) end += 100;
    const nextStart = String(first + 1);
    const nextEndFull = String(end + 1);
    const nextEnd = range[3].length === 2 ? nextEndFull.slice(-2) : nextEndFull;
    return nextStart + range[2] + nextEnd;
  }
  if (/^\\d{4}$/.test(value)) return String(Number(value) + 1);
  return "";
}
function gradeOrdinal(name) {
  const value = clean(name).replace(/\\s*\\([^)]*\\)\\s*$/, "").toLocaleLowerCase()
    .replace(/^(class|grade|std\\.?|standard)\\s+/, "").replace(/[.]/g,"").trim();
  if (/^(pre[- ]?nursery|playgroup|play group)$/.test(value)) return 0;
  if (/^nursery$/.test(value)) return 1;
  if (/^(lkg|junior kg|jr kg|jr kindergarten)$/.test(value)) return 2;
  if (/^(ukg|senior kg|sr kg|sr kindergarten)$/.test(value)) return 3;
  const roman = {i:4,ii:5,iii:6,iv:7,v:8,vi:9,vii:10,viii:11,ix:12,x:13,xi:14,xii:15};
  if (Object.prototype.hasOwnProperty.call(roman, value)) return roman[value];
  const numeric = value.match(/^(\\d+)(st|nd|rd|th)?$/);
  if (numeric) return Number(numeric[1]) + 3;
  return null;
}
function normalizeClasses(raw, students) {
  const configured = (Array.isArray(raw) ? raw : []).filter(item => item && clean(item.name || item.className));
  const list = configured.map((item, index) => ({
    id: String(item.id || "class-option-" + index),
    name: clean(item.name || item.className),
    section: clean(item.section),
    displayName: clean(item.displayName),
    displayOrder: item.displayOrder == null || item.displayOrder === "" ? null : Number(item.displayOrder),
    isActive: item.status !== "Inactive" && item.isActive !== false
  }));
  const fromStudents = new Map(list.map(item => [classKey(item.name,item.section), item]));
  (Array.isArray(students) ? students : []).forEach(student => {
    const name = clean(student.className);
    const section = clean(student.section);
    if (!name) return;
    const key = classKey(name, section);
    if (!fromStudents.has(key)) fromStudents.set(key, {id:key,name,section,displayName:"",displayOrder:null,isActive:true});
  });
  return Array.from(fromStudents.values()).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})||a.section.localeCompare(b.section));
}
function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0,10);
}
function academicDateLabel(value) {
  const parts = dateOnly(value).split("-");
  if (parts.length !== 3 || parts.some(part => !part)) return "—";
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).replace(/\//g, "-");
}
const EMPTY_ACADEMIC_YEAR_FORM = {
  label: "", startDate: "", endDate: "", isCurrent: false,
  feeReceiptPrefix: "", invoicePrefix: "", admissionFormNumberPrefix: "", firstAdmissionFormNumber: ""
};
function newRecordFor(title) {
  if (title === "Manage Marks Percentage for Leave Type") return { id: makeId("leave-rule"), leaveType: "", marksPercentage: "100", notes: "" };
  if (title === "Manage House") return { id: makeId("house"), name: "", description: "", color: "#2563eb", status: "Active" };
  return { id: makeId("eligibility"), classId: "", eligibleBirthDateFrom: "", eligibleBirthDateTo: "", notes: "" };
}

export default function AcademicOperationPage({ title, description, Icon, onBack, notify, t, students: propStudents = [], onRefreshStudents }) {
  const text = typeof t === "function" ? t : value => value;
  const [students, setStudents] = useState(Array.isArray(propStudents) ? propStudents : []);
  const [classes, setClasses] = useState([]);
  const [houses, setHouses] = useState([]);
  const [years, setYears] = useState([]);
  const [yearSettings, setYearSettings] = useState({});
  const [rules, setRules] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("All classes");
  const [yearFilter, setYearFilter] = useState("All years");
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetClassId, setTargetClassId] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [houseTarget, setHouseTarget] = useState("");
  const [rollDraft, setRollDraft] = useState({});
  const [rollSortBy, setRollSortBy] = useState("gender");
  const [rollThenSortBy, setRollThenSortBy] = useState("firstName");
  const [isRollEditing, setIsRollEditing] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [recordForm, setRecordForm] = useState(() => newRecordFor(title));
  const [yearForm, setYearForm] = useState(EMPTY_ACADEMIC_YEAR_FORM);
  const [editingYearId, setEditingYearId] = useState("");
  const [yearFormOpen, setYearFormOpen] = useState(false);
  const [classWorkflowView, setClassWorkflowView] = useState("list");
  const [workflowGroupKey, setWorkflowGroupKey] = useState("");
  const [workflowYear, setWorkflowYear] = useState("");
  const [workflowTargetClassId, setWorkflowTargetClassId] = useState("");
  const [workflowStudentIds, setWorkflowStudentIds] = useState([]);

  const activeStudents = useMemo(() => students.filter(student => clean(student.status).toLowerCase() !== "inactive"), [students]);
  const classChoices = useMemo(() => normalizeClasses(classes, students), [classes, students]);
  const classFilterOptions = useMemo(() => {
    const options = new Map();
    classChoices.forEach(item => {
      const classPartsForFilter = classFilterParts(item.name, item.section);
      const displayParts = classFilterParts(item.displayName || item.name, item.section);
      const baseName = clean(item.displayName) ? displayParts.name : classPartsForFilter.name;
      const section = classPartsForFilter.section || displayParts.section;
      if (!baseName) return;
      const key = classKey(classPartsForFilter.name, section);
      if (!options.has(key)) {
        options.set(key, { key, label: [baseName, section].filter(Boolean).join(" ") });
      }
    });
    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [classChoices]);
  const eligibilityClassChoices = useMemo(() => {
    const grouped = new Map();
    classChoices.forEach(item => {
      const label = eligibilityGradeLabel(item);
      if (!label) return;
      const key = label.toLocaleLowerCase();
      if (!grouped.has(key)) grouped.set(key, { id: "eligibility-class-" + key.replace(/[^a-z0-9]+/g, "-"), name: label, section: "", displayName: label });
    });
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [classChoices]);
  const yearsLabels = useMemo(() => Array.from(new Set([
    ...years.map(item => clean(item.label)),
    ...students.map(item => clean(item.academicYear))
  ].filter(Boolean))).sort((a,b)=>b.localeCompare(a, undefined, {numeric:true})), [years, students]);
  const configuredYearOptions = useMemo(() => {
    const source = years.map(item => clean(item.label)).filter(Boolean);
    const fallback = yearsLabels;
    return Array.from(new Set(source.length ? source : fallback)).sort((a,b)=>b.localeCompare(a, undefined, {numeric:true}));
  }, [years, yearsLabels]);
  const currentAcademicYearLabel = useMemo(() => {
    const current = years.find(item => Boolean(item.is_current ?? item.isCurrent));
    if (current?.label) return clean(current.label);
    const sorted = [...years].sort((a,b) => dateOnly(b.start_date || b.startDate).localeCompare(dateOnly(a.start_date || a.startDate)) || clean(b.label).localeCompare(clean(a.label), undefined, {numeric:true}));
    return clean(sorted[0]?.label || yearsLabels[0] || "");
  }, [years, yearsLabels]);
  const classWorkflowGroups = useMemo(() => {
    const map = new Map();
    classChoices.forEach(item => {
      const parts = classParts(item.name, item.section);
      if (!parts.name) return;
      const key = classKey(parts.name, parts.section);
      if (!map.has(key)) map.set(key, {key,name:parts.name,section:parts.section,label:classLabel(item) || groupLabel(parts.name,parts.section),configured:item});
      else {
        const existing=map.get(key);
        if (!existing.label || existing.label===groupLabel(existing.name,existing.section)) existing.label=classLabel(item) || existing.label;
        if (!existing.configured) existing.configured=item;
      }
    });
    students.forEach(student => {
      if (!clean(student.className)) return;
      const parts=classParts(student.className,student.section);
      const key=classKey(parts.name,parts.section);
      if (!map.has(key)) map.set(key,{key,name:parts.name,section:parts.section,label:groupLabel(student.className,student.section),configured:null});
    });
    return Array.from(map.values()).map(group => ({
      ...group,
      count: students.filter(student=>studentIsActive(student)&&classKey(student.className,student.section)===group.key).length
    })).sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true}));
  }, [classChoices, students]);
  const visibleClassWorkflowGroups = useMemo(() => {
    const needle=query.trim().toLocaleLowerCase();
    return classWorkflowGroups.filter(group=>!needle||group.label.toLocaleLowerCase().includes(needle)||students.some(student=>
      classKey(student.className,student.section)===group.key && [student.name,student.id,student.studentId,student.rollNumber]
        .some(value=>String(value||"").toLocaleLowerCase().includes(needle))
    ));
  }, [classWorkflowGroups,query,students]);
  const currentWorkflowGroup = classWorkflowGroups.find(group=>group.key===workflowGroupKey)||null;
  const workflowClassStudentTotal = currentWorkflowGroup ? students.filter(student=>
    studentIsActive(student) &&
    classKey(student.className,student.section)===currentWorkflowGroup.key &&
    clean(student.academicYear)===clean(workflowYear)
  ).length : 0;
  const workflowClassStudents = useMemo(() => {
    if(!currentWorkflowGroup) return [];
    return students.filter(student=>
      studentIsActive(student) &&
      classKey(student.className,student.section)===currentWorkflowGroup.key &&
      clean(student.academicYear)===clean(workflowYear) &&
      (!query.trim() || clean(student.name).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) ||
        clean(student.id).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    ).sort((a,b)=>clean(a.name).localeCompare(clean(b.name)));
  }, [students,currentWorkflowGroup,workflowYear,query]);
  const workflowReviewStudents = useMemo(() => {
    if(!currentWorkflowGroup) return [];
    return students.filter(student=>
      studentIsActive(student) &&
      classKey(student.className,student.section)===currentWorkflowGroup.key &&
      (title==="Promote to Alumni" || clean(student.academicYear)===clean(workflowYear)) &&
      (!query.trim() || [student.name,student.id,student.studentId,student.rollNumber,student.academicYear]
        .some(value=>String(value||"").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))
    ).sort((a,b)=>clean(a.name).localeCompare(clean(b.name)));
  }, [students,currentWorkflowGroup,title,workflowYear,query]);
  const allWorkflowStudentsSelected = workflowClassStudents.length>0 && workflowClassStudents.every(student=>workflowStudentIds.includes(String(student.id)));
  const allWorkflowReviewStudentsSelected = workflowReviewStudents.length>0 && workflowReviewStudents.every(student=>workflowStudentIds.includes(String(student.id)));
  const activeClassCount = classWorkflowGroups.filter(group=>group.count>0).length;
  const activeClassStudentCount = students.filter(student=>studentIsActive(student)).length;
  const alumniCount = students.filter(student=>student.alumni===true || student.status==="Alumni").length;

  async function loadPage({quiet=false}={}) {
    if (!quiet) setLoading(true);
    setError("");
    setSuccess("");
    try {
      const results = await Promise.allSettled([
        apiGet("/students"),
        apiGet("/school-classes"),
        apiGet("/module-data/houses"),
        apiGet("/module-data/leave-marks-percentage"),
        apiGet("/module-data/class-eligibility-criteria"),
        apiGet("/bootstrap"),
        apiGet("/module-data/academic-year-settings")
      ]);
      if (results[0].status === "rejected") throw results[0].reason;
      const loadedStudents = Array.isArray(results[0].value?.students) ? results[0].value.students : (Array.isArray(propStudents) ? propStudents : []);
      setStudents(loadedStudents);
      if (results[1].status === "fulfilled") setClasses(Array.isArray(results[1].value?.classes) ? results[1].value.classes : []);
      if (results[2].status === "fulfilled") setHouses(Array.isArray(results[2].value?.data?.houses) ? results[2].value.data.houses : []);
      if (results[3].status === "fulfilled") setRules(Array.isArray(results[3].value?.data?.rules) ? results[3].value.data.rules : []);
      if (results[4].status === "fulfilled") setRecords(Array.isArray(results[4].value?.data?.criteria) ? results[4].value.data.criteria : []);
      if (results[5].status === "fulfilled") {
        const loadedYears = Array.isArray(results[5].value?.academicYears) ? results[5].value.academicYears : [];
        setYears(loadedYears);
      }
      if (results[6].status === "fulfilled") {
        const savedYearSettings = results[6].value?.data?.years;
        setYearSettings(savedYearSettings && typeof savedYearSettings === "object" && !Array.isArray(savedYearSettings) ? savedYearSettings : {});
      }
    } catch (e) {
      setError(e?.message || "This page could not load its data. Please refresh and try again.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void loadPage(); }, []);
  useEffect(() => {
    const values = classFilterOptions.map(option => option.key);
    if (classFilter !== "All classes" && !values.includes(classFilter)) setClassFilter("All classes");
  }, [classFilterOptions, classFilter]);

  function clearMessages() { setError(""); setSuccess(""); }
  function flash(message) { setSuccess(message); notify?.(message); }
  function selectedClass() { return classChoices.find(item => item.id === targetClassId) || null; }
  function updateRecordForm(key, value) { setRecordForm(current => ({...current,[key]:value})); }

  const filteredStudents = useMemo(() => {
    const needle=query.trim().toLowerCase();
    const matching = students.filter(student => {
      if (classFilter !== "All classes" && studentClassFilterKey(student) !== classFilter) return false;
      if (yearFilter !== "All years" && clean(student.academicYear) !== yearFilter) return false;
      if (title === "Promote to Alumni" && clean(student.status).toLowerCase() === "inactive") return false;
      return !needle || [student.name,student.id,student.studentId,student.className,student.section,student.rollNumber,student.academicYear,student.house]
        .some(value=>String(value||"").toLowerCase().includes(needle));
    });
    if (title === "Update Roll Numbers") {
      return matching.sort((a,b)=>compareRollOrder(a,b,rollSortBy,rollThenSortBy));
    }
    return matching.sort((a,b)=>clean(a.className).localeCompare(clean(b.className),undefined,{numeric:true})||
      clean(a.rollNumber).localeCompare(clean(b.rollNumber),undefined,{numeric:true})||clean(a.name).localeCompare(clean(b.name)));
  }, [students,classFilter,yearFilter,query,title,rollSortBy,rollThenSortBy]);

  const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every(student => selectedIds.includes(String(student.id)));

  function toggleSelected(id) {
    const key=String(id);
    setSelectedIds(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);
  }
  function toggleVisible() {
    const visible=filteredStudents.map(student=>String(student.id));
    setSelectedIds(current=>allVisibleSelected?current.filter(id=>!visible.includes(id)):Array.from(new Set([...current,...visible])));
  }

  async function persistModuleData(moduleKey, data, successMessage) {
    setSaving(true); clearMessages();
    try {
      await apiPut("/module-data/"+moduleKey,{data});
      await loadPage({quiet:true});
      flash(successMessage);
      return true;
    } catch(e) {
      setError(e?.message||"Changes could not be saved.");
      return false;
    } finally { setSaving(false); }
  }

  function editRecord(record) {
    setEditingId(record.id);
    if (title === "Manage Class Eligibility Criteria") {
      const existingLabel = eligibilityGradeLabel({ name: record.className || record.classId || "" });
      const matchingClass = eligibilityClassChoices.find(item => item.name.toLocaleLowerCase() === existingLabel.toLocaleLowerCase());
      setRecordForm({ ...record, classId: matchingClass?.id || "" });
    } else {
      setRecordForm({...record});
    }
    setError(""); setSuccess("");
  }
  function resetRecordForm() { setEditingId(""); setRecordForm(newRecordFor(title)); }
  async function saveRecord(event) {
    event.preventDefault(); clearMessages();
    if (title === "Manage Marks Percentage for Leave Type") {
      const leaveType=clean(recordForm.leaveType), percentage=Number(recordForm.marksPercentage);
      if (!leaveType) return setError("Leave Type is required.");
      if (!Number.isFinite(percentage)||percentage<0||percentage>100) return setError("Marks Percentage must be between 0 and 100.");
      if (rules.some(item=>item.id!==editingId&&clean(item.leaveType).toLowerCase()===leaveType.toLowerCase())) return setError("This leave type already has a marks percentage rule.");
      const item={...recordForm,id:editingId||makeId("leave-rule"),leaveType,marksPercentage:percentage,notes:clean(recordForm.notes)};
      if(await persistModuleData("leave-marks-percentage",{initialized:true,rules:editingId?rules.map(rule=>rule.id===editingId?item:rule):[...rules,item]},editingId?"Leave marks percentage updated.":"Leave marks percentage added.")) resetRecordForm();
      return;
    }
    if (title === "Manage House") {
      const name=clean(recordForm.name);
      if(!name) return setError("House Name is required.");
      if(houses.some(item=>item.id!==editingId&&clean(item.name).toLowerCase()===name.toLowerCase())) return setError("This house already exists.");
      const item={...recordForm,id:editingId||makeId("house"),name,description:clean(recordForm.description),status:recordForm.status||"Active"};
      if(await persistModuleData("houses",{initialized:true,houses:editingId?houses.map(house=>house.id===editingId?item:house):[...houses,item]},editingId?"House updated.":"House created.")) resetRecordForm();
      return;
    }
    const picked=eligibilityClassChoices.find(item=>item.id===recordForm.classId);
    const from=String(recordForm.eligibleBirthDateFrom||"");
    const to=String(recordForm.eligibleBirthDateTo||"");
    if(!picked) return setError("Choose a class.");
    if(from&&to&&from>to) return setError("The birth-date end must be on or after the start date.");
    if(records.some(item=>item.id!==editingId&&eligibilityGradeLabel({name:item.className||""}).toLocaleLowerCase()===picked.name.toLocaleLowerCase())) return setError("Eligibility criteria already exist for this class. Edit the existing rule.");
    const item={...recordForm,id:editingId||makeId("eligibility"),classId:picked.id,className:picked.name,eligibleBirthDateFrom:from,eligibleBirthDateTo:to,notes:clean(recordForm.notes)};
    if(await persistModuleData("class-eligibility-criteria",{initialized:true,criteria:editingId?records.map(rule=>rule.id===editingId?item:rule):[...records,item]},editingId?"Eligibility criteria updated.":"Eligibility criteria added.")) resetRecordForm();
  }

  async function deleteRecord(record) {
    const label=title==="Manage House"?record.name:title==="Manage Marks Percentage for Leave Type"?record.leaveType:record.className;
    if(!window.confirm("Delete this record: "+label+"?")) return;
    if(title==="Manage House") {
      if(students.some(student=>clean(student.house)===clean(record.name))) return setError("This house is assigned to students. Reassign those students before deleting the house.");
      await persistModuleData("houses",{initialized:true,houses:houses.filter(item=>item.id!==record.id)},"House deleted.");
    } else if(title==="Manage Marks Percentage for Leave Type") {
      await persistModuleData("leave-marks-percentage",{initialized:true,rules:rules.filter(item=>item.id!==record.id)},"Leave marks rule deleted.");
    } else {
      await persistModuleData("class-eligibility-criteria",{initialized:true,criteria:records.filter(item=>item.id!==record.id)},"Eligibility criteria deleted.");
    }
    if(editingId===record.id) resetRecordForm();
  }

  async function saveAcademicYear(event) {
    event.preventDefault(); clearMessages();
    const label=clean(yearForm.label);
    if(!label) return setError("Academic Year label is required (for example, 2026-2027).");
    if(yearForm.startDate&&yearForm.endDate&&yearForm.startDate>yearForm.endDate) return setError("End date must be on or after start date.");
    if(!yearForm.startDate || !yearForm.endDate) return setError("From Date and To Date are both required.");
    const wasEditing=Boolean(editingYearId);
    setSaving(true);
    try {
      const requestPayload = {
        label,
        startDate: yearForm.startDate,
        endDate: yearForm.endDate,
        isCurrent: wasEditing ? Boolean(yearForm.isCurrent) : true
      };
      const response = wasEditing
        ? await apiPatch("/academic-years/"+encodeURIComponent(editingYearId),requestPayload)
        : await apiPost("/academic-years",requestPayload);
      const savedYear=response?.academicYear;
      if(!savedYear?.id) throw new Error("The academic year was not returned by the server. Please refresh and check the list before retrying.");
      const yearId=String(savedYear.id);
      const nextSettings={
        ...yearSettings,
        [yearId]:{
          feeReceiptPrefix:clean(yearForm.feeReceiptPrefix),
          invoicePrefix:clean(yearForm.invoicePrefix),
          admissionFormNumberPrefix:clean(yearForm.admissionFormNumberPrefix),
          firstAdmissionFormNumber:clean(yearForm.firstAdmissionFormNumber)
        }
      };
      try {
        await apiPut("/module-data/academic-year-settings",{data:{years:nextSettings}});
        setYearSettings(nextSettings);
      } catch(settingsError) {
        await loadPage({quiet:true});
        setError("Academic year details were saved, but the prefix settings were not saved: "+(settingsError?.message||"Please retry."));
        return;
      }
      setEditingYearId("");
      setYearForm(EMPTY_ACADEMIC_YEAR_FORM);
      setYearFormOpen(false);
      await loadPage({quiet:true});
      flash(wasEditing?"Academic year updated.":"Academic year created.");
    } catch(e) { setError(e?.message||"Academic year could not be saved."); }
    finally { setSaving(false); }
  }
  function startNewAcademicYear() {
    clearMessages();
    setEditingYearId("");
    setYearForm({...EMPTY_ACADEMIC_YEAR_FORM,isCurrent:!years.some(year=>Boolean(year.is_current??year.isCurrent))});
    setYearFormOpen(true);
  }
  function editAcademicYear(year) {
    const settings=yearSettings[String(year.id)]||{};
    setEditingYearId(String(year.id));
    setYearForm({
      ...EMPTY_ACADEMIC_YEAR_FORM,
      label:year.label||"",
      startDate:dateOnly(year.start_date||year.startDate),
      endDate:dateOnly(year.end_date||year.endDate),
      isCurrent:Boolean(year.is_current??year.isCurrent),
      feeReceiptPrefix:settings.feeReceiptPrefix||"",
      invoicePrefix:settings.invoicePrefix||"",
      admissionFormNumberPrefix:settings.admissionFormNumberPrefix||"",
      firstAdmissionFormNumber:settings.firstAdmissionFormNumber||""
    });
    setError("");
    setSuccess("");
    setYearFormOpen(true);
  }
  function cancelAcademicYearEdit() {
    setEditingYearId("");
    setYearForm(EMPTY_ACADEMIC_YEAR_FORM);
    setYearFormOpen(false);
    clearMessages();
  }
  async function setCurrentAcademicYear(yearId, isCurrent) {
    clearMessages();
    setSaving(true);
    try {
      await apiPatch("/academic-years/"+encodeURIComponent(yearId),{isCurrent});
      await loadPage({quiet:true});
      flash(isCurrent?"Current academic year updated.":"Academic year is no longer marked as current.");
    } catch(e) { setError(e?.message||"The current academic year could not be updated."); }
    finally { setSaving(false); }
  }

  function openChangeClass(group) {
    setWorkflowGroupKey(group.key);
    setWorkflowYear(currentAcademicYearLabel || configuredYearOptions[0] || "");
    setWorkflowTargetClassId("");
    setWorkflowStudentIds([]);
    setQuery("");
    setClassWorkflowView("change");
    clearMessages();
  }
  function backToClassWorkflowList({keepMessages=false}={}) {
    setClassWorkflowView("list");
    setWorkflowGroupKey("");
    setWorkflowTargetClassId("");
    setWorkflowStudentIds([]);
    setQuery("");
    if(!keepMessages) clearMessages();
  }
  function toggleWorkflowStudent(id) {
    const key=String(id);
    setWorkflowStudentIds(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);
  }
  function toggleWorkflowVisibleStudents() {
    const visible=workflowClassStudents.map(student=>String(student.id));
    setWorkflowStudentIds(current=>allWorkflowStudentsSelected
      ? current.filter(id=>!visible.includes(id))
      : Array.from(new Set([...current,...visible])));
  }
  function toggleWorkflowVisibleReviewStudents() {
    const visible=workflowReviewStudents.map(student=>String(student.id));
    setWorkflowStudentIds(current=>allWorkflowReviewStudentsSelected
      ? current.filter(id=>!visible.includes(id))
      : Array.from(new Set([...current,...visible])));
  }
  function nextClassForGroup(group) {
    const activeChoices=classChoices.filter(item=>item.isActive!==false);
    const source=activeChoices.find(item=>classKey(item.name,item.section)===group.key);
    const sourceParts=source?classParts(source.name,source.section):{name:group.name,section:group.section};
    const sourceRank=gradeOrdinal(sourceParts.name);
    const sameSection=activeChoices.filter(item=>{
      const parts=classParts(item.name,item.section);
      return parts.section.toLocaleLowerCase()===sourceParts.section.toLocaleLowerCase() &&
        classKey(parts.name,parts.section)!==group.key;
    });
    if(sourceRank!==null) {
      const ranked=sameSection.find(item=>gradeOrdinal(classParts(item.name,item.section).name)===sourceRank+1);
      if(ranked) return ranked;
    }
    if(source?.displayOrder!==null && source?.displayOrder!==undefined && Number.isFinite(source.displayOrder)) {
      const ordered=sameSection.filter(item=>item.displayOrder!==null && Number.isFinite(item.displayOrder) && item.displayOrder>source.displayOrder)
        .sort((a,b)=>a.displayOrder-b.displayOrder)[0];
      if(ordered) return ordered;
    }
    return null;
  }
  async function applyStudentUpdates(items, makeChanges, successMessage) {
    setSaving(true);
    clearMessages();
    let updated=0;
    const failures=[];
    try {
      for(const student of items) {
        const id=String(student.studentId||student.id||"");
        if(!id) { failures.push((student.name||"Student")+": missing student ID"); continue; }
        const changes=makeChanges(student);
        try {
          const result=await apiPatch("/students/"+encodeURIComponent(id),changes);
          setStudents(current=>current.map(item=>String(item.id)===id
            ? (result?.student||{...item,...changes})
            : item));
          updated++;
        } catch(e) {
          failures.push((student.name||id)+": "+(e?.message||"update failed"));
        }
      }
      await loadPage({quiet:true});
      await onRefreshStudents?.();
      if(failures.length) {
        setError(updated+" student(s) updated. "+failures.length+" update(s) failed: "+failures.slice(0,5).join(" | "));
        return false;
      }
      flash(typeof successMessage==="function"?successMessage(updated):successMessage);
      return true;
    } catch(e) {
      setError(e?.message||"Student records could not be refreshed after saving.");
      return false;
    } finally {
      setSaving(false);
    }
  }
  async function saveChangeClass(event) {
    event.preventDefault();
    clearMessages();
    const group=currentWorkflowGroup;
    if(!group) return setError("Choose a class from the list and try again.");
    if(!clean(workflowYear)) return setError("Select an academic year.");
    const destination=classChoices.find(item=>String(item.id)===String(workflowTargetClassId)&&item.isActive!==false);
    if(!destination) return setError("Choose the destination class.");
    const destinationParts=classParts(destination.name,destination.section);
    if(classKey(destinationParts.name,destinationParts.section)===group.key) return setError("Choose a different destination class.");
    const picked=students.filter(student=>
      workflowStudentIds.includes(String(student.id)) &&
      studentIsActive(student) &&
      classKey(student.className,student.section)===group.key &&
      clean(student.academicYear)===clean(workflowYear)
    );
    if(!picked.length) return setError("Select at least one student from this class and academic year.");
    const complete=await applyStudentUpdates(
      picked,
      ()=>({className:destinationParts.name,section:destinationParts.section}),
      count=>count+" student(s) moved from "+group.label+" to "+classLabel(destination)+"."
    );
    if(complete) backToClassWorkflowList({keepMessages:true});
  }
  function openPromotionReview(group) {
    clearMessages();
    const sourceYear=years.find(item=>Boolean(item.is_current??item.isCurrent)) ||
      years.find(item=>clean(item.label)===currentAcademicYearLabel);
    if(!sourceYear?.label) return setError("You cannot promote students because the current academic year is not configured. Please create or mark one in Manage Academic Year.");
    const expectedNextLabel=nextAcademicYearLabel(sourceYear.label);
    const nextYear=expectedNextLabel && years.find(item=>clean(item.label)===expectedNextLabel);
    if(!nextYear) return setError("You cannot promote students because next academic year doesn't exist. Please create "+(expectedNextLabel||"the next academic year")+" in Manage Academic Year first.");
    const sourceStudents=students.filter(student=>studentIsActive(student)&&
      classKey(student.className,student.section)===group.key&&
      clean(student.academicYear)===clean(sourceYear.label));
    if(!sourceStudents.length) return setError("No active students were found in "+group.label+" for academic year "+sourceYear.label+".");
    const destination=nextClassForGroup(group);
    setWorkflowGroupKey(group.key);
    setWorkflowYear(clean(sourceYear.label));
    setWorkflowTargetClassId(destination?String(destination.id):"");
    setWorkflowStudentIds(sourceStudents.map(student=>String(student.id)));
    setQuery("");
    setClassWorkflowView("review-promotion");
  }
  async function savePromotionReview() {
    clearMessages();
    const group=currentWorkflowGroup;
    if(!group) return setError("Choose a class from the list and try again.");
    const sourceYear=years.find(item=>clean(item.label)===clean(workflowYear));
    if(!sourceYear?.label) return setError("The source academic year is no longer available. Refresh and try again.");
    const expectedNextLabel=nextAcademicYearLabel(sourceYear.label);
    const nextYear=expectedNextLabel&&years.find(item=>clean(item.label)===expectedNextLabel);
    if(!nextYear) return setError("You cannot promote students because next academic year doesn't exist. Please create "+(expectedNextLabel||"the next academic year")+" in Manage Academic Year first.");
    const destination=classChoices.find(item=>String(item.id)===String(workflowTargetClassId)&&item.isActive!==false);
    if(!destination) return setError("Choose the destination class for this promotion.");
    if(classKey(destination.name,destination.section)===group.key) return setError("Choose a destination class different from the current class.");
    const picked=students.filter(student=>workflowStudentIds.includes(String(student.id))&&studentIsActive(student)&&
      classKey(student.className,student.section)===group.key&&clean(student.academicYear)===clean(sourceYear.label));
    if(!picked.length) return setError("Select at least one student to promote.");
    const destinationParts=classParts(destination.name,destination.section);
    if(!window.confirm("Promote "+picked.length+" student(s) from "+group.label+" to "+classLabel(destination)+" for academic year "+nextYear.label+"?")) return;
    const complete=await applyStudentUpdates(
      picked,
      ()=>({className:destinationParts.name,section:destinationParts.section,academicYear:clean(nextYear.label)}),
      count=>count+" student(s) promoted from "+group.label+" to "+classLabel(destination)+" for "+nextYear.label+"."
    );
    if(complete) backToClassWorkflowList({keepMessages:true});
  }
  function openAlumniReview(group) {
    clearMessages();
    const groupStudents=students.filter(student=>studentIsActive(student)&&classKey(student.className,student.section)===group.key);
    if(!groupStudents.length) return setError("No active students were found in "+group.label+".");
    setWorkflowGroupKey(group.key);
    setWorkflowYear("");
    setWorkflowTargetClassId("");
    setWorkflowStudentIds(groupStudents.map(student=>String(student.id)));
    setQuery("");
    setClassWorkflowView("review-alumni");
  }
  async function saveAlumniReview() {
    clearMessages();
    const group=currentWorkflowGroup;
    if(!group) return setError("Choose a class from the list and try again.");
    const picked=students.filter(student=>workflowStudentIds.includes(String(student.id))&&studentIsActive(student)&&classKey(student.className,student.section)===group.key);
    if(!picked.length) return setError("Select at least one student to promote to Alumni.");
    if(!window.confirm("Promote "+picked.length+" selected student(s) from "+group.label+" to Alumni? Their school status will be set to Inactive.")) return;
    const complete=await applyStudentUpdates(
      picked,
      student=>({status:"Inactive",alumni:true,alumniAcademicYear:clean(student.academicYear||currentAcademicYearLabel)}),
      count=>count+" student(s) from "+group.label+" were promoted to Alumni and marked Inactive."
    );
    if(complete) backToClassWorkflowList({keepMessages:true});
  }
  function renderWorkflowStudentRows(items, showAllToggle, allSelected, toggleAll) {
    return <div className="aop-review-student-list">
      {showAllToggle&&<label className="aop-review-student-row aop-review-student-all">
        <input type="checkbox" checked={allSelected} disabled={!items.length} onChange={toggleAll}/>
        <span className="aop-review-student-name"><strong>Select all visible students</strong><small>{items.length} student(s) shown</small></span>
      </label>}
      {items.length?items.map(student=><label className="aop-review-student-row" key={String(student.id)}>
        <input type="checkbox" checked={workflowStudentIds.includes(String(student.id))} onChange={()=>toggleWorkflowStudent(student.id)}/>
        <span className="aop-review-student-name"><strong>{student.name||"Unnamed student"}</strong><small>Student ID: {student.studentId||student.id}{student.rollNumber?" · Roll No. "+student.rollNumber:""}{student.academicYear?" · "+student.academicYear:""}</small></span>
        <span className="aop-review-class-label">{groupLabel(student.className,student.section)}</span>
      </label>):<p className="aop-empty-students">No active students match this class, academic year and search.</p>}
    </div>;
  }
  function renderClassWorkflow() {
    const isChange=title==="Change Class";
    const isPromote=title==="Promote Class";
    const isAlumni=title==="Promote to Alumni";
    const isChangeDetail=isChange&&classWorkflowView==="change"&&currentWorkflowGroup;
    const isPromotionReview=isPromote&&classWorkflowView==="review-promotion"&&currentWorkflowGroup;
    const isAlumniReview=isAlumni&&classWorkflowView==="review-alumni"&&currentWorkflowGroup;
    const destinationChoices=classChoices.filter(item=>item.isActive!==false&&(!currentWorkflowGroup||classKey(item.name,item.section)!==currentWorkflowGroup.key));
    if(isChangeDetail) {
      return <div className="aop-workflow-detail">
        <button type="button" className="aop-workflow-back" onClick={backToClassWorkflowList}><ArrowLeft size={15}/> Back to class list</button>
        <div className="aop-workflow-step-heading"><span className="aop-step-pill">STEP 2 OF 2</span><h3>Change class for selected students</h3><p>Review the source class, academic year and destination before saving.</p></div>
        <section className="aop-panel aop-class-change-form">
          <div className="aop-workflow-summary">
            <div><span>Source class</span><strong>{currentWorkflowGroup.label}</strong></div>
            <div><span>Active students</span><strong>{workflowClassStudentTotal}</strong></div>
            <div><span>Selected</span><strong>{workflowStudentIds.length}</strong></div>
          </div>
          <form className="aop-form" onSubmit={saveChangeClass}>
            <div className="aop-workflow-select-grid">
              <label className="aop-field"><span>Academic Year *</span><select value={workflowYear} onChange={event=>{setWorkflowYear(event.target.value);setWorkflowStudentIds([]);}} required><option value="">Select academic year</option>{configuredYearOptions.map(year=><option key={year} value={year}>{year}</option>)}</select></label>
              <label className="aop-field"><span>Change Class To *</span><select value={workflowTargetClassId} onChange={event=>setWorkflowTargetClassId(event.target.value)} required><option value="">Select destination class</option>{destinationChoices.map(item=><option key={item.id} value={item.id}>{classLabel(item)}</option>)}</select></label>
            </div>
            <div className="aop-review-section-heading"><div><h4>Choose students</h4><p>{workflowClassStudents.length} matching · {workflowClassStudentTotal} active in {workflowYear||"the selected year"} for {currentWorkflowGroup.label}.</p></div><span className="aop-selected-count">{workflowStudentIds.length} selected</span></div>
            <div className="aop-review-toolbar"><label className="aop-search"><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search students by name or ID…"/></label></div>
            {renderWorkflowStudentRows(workflowClassStudents,true,allWorkflowStudentsSelected,toggleWorkflowVisibleStudents)}
            <div className="aop-workflow-sticky-actions"><span>{workflowStudentIds.length} student(s) will change class</span><div><button type="button" className="aop-button" onClick={backToClassWorkflowList} disabled={saving}>Cancel</button><button type="submit" className="aop-button primary" disabled={saving||loading||!workflowStudentIds.length||!workflowTargetClassId}><Save size={15}/>{saving?"Saving…":"Save Changes"}</button></div></div>
          </form>
        </section>
      </div>;
    }
    if(isPromotionReview) {
      const sourceYear=years.find(item=>clean(item.label)===clean(workflowYear));
      const nextYearLabel=nextAcademicYearLabel(workflowYear);
      const nextYear=years.find(item=>clean(item.label)===clean(nextYearLabel));
      const destination=classChoices.find(item=>String(item.id)===String(workflowTargetClassId));
      const pickedCount=students.filter(student=>workflowStudentIds.includes(String(student.id))&&studentIsActive(student)&&classKey(student.className,student.section)===currentWorkflowGroup.key&&clean(student.academicYear)===clean(workflowYear)).length;
      return <div className="aop-workflow-detail">
        <button type="button" className="aop-workflow-back" onClick={backToClassWorkflowList}><ArrowLeft size={15}/> Back to class list</button>
        <div className="aop-workflow-step-heading"><span className="aop-step-pill">PROMOTION REVIEW</span><h3>Review class promotion</h3><p>Confirm the promotion mapping and selected students before any records are changed.</p></div>
        <section className="aop-panel">
          <div className="aop-promotion-path">
            <div><span>Promoting from</span><strong>{currentWorkflowGroup.label}</strong><small>{sourceYear?.label||workflowYear}</small></div>
            <ArrowRight size={20}/>
            <div><span>Promoting to</span><strong>{destination?classLabel(destination):"Choose destination class"}</strong><small>{nextYear?.label||nextYearLabel||"Next academic year"}</small></div>
          </div>
          {!nextYear&&<div className="aop-workflow-warning"><AlertCircle size={17}/><span>Next academic year is not configured. Create it in Manage Academic Year before continuing.</span></div>}
          <div className="aop-form aop-promotion-settings">
            <label className="aop-field"><span>Destination class *</span><select value={workflowTargetClassId} onChange={event=>setWorkflowTargetClassId(event.target.value)} required><option value="">Choose destination class</option>{destinationChoices.map(item=><option key={item.id} value={item.id}>{classLabel(item)}</option>)}</select></label>
            <div className="aop-readonly-year"><span>Next academic year</span><strong>{nextYear?.label||nextYearLabel||"Not available"}</strong></div>
          </div>
          <div className="aop-review-section-heading"><div><h4>Students to promote</h4><p>{currentWorkflowGroup.label} · {workflowYear}</p></div><span className="aop-selected-count">{pickedCount} selected</span></div>
          <div className="aop-review-toolbar"><label className="aop-search"><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search selected class students"/></label></div>
          {renderWorkflowStudentRows(workflowReviewStudents,true,allWorkflowReviewStudentsSelected,toggleWorkflowVisibleReviewStudents)}
          <div className="aop-workflow-sticky-actions"><span>{pickedCount} student(s) will be promoted</span><div><button type="button" className="aop-button" onClick={backToClassWorkflowList} disabled={saving}>Cancel</button><button type="button" className="aop-button primary" onClick={()=>void savePromotionReview()} disabled={saving||loading||!pickedCount||!nextYear||!workflowTargetClassId}><GraduationCap size={15}/>{saving?"Promoting…":"Confirm Promotion"}</button></div></div>
        </section>
      </div>;
    }
    if(isAlumniReview) {
      const pickedCount=students.filter(student=>workflowStudentIds.includes(String(student.id))&&studentIsActive(student)&&classKey(student.className,student.section)===currentWorkflowGroup.key).length;
      return <div className="aop-workflow-detail">
        <button type="button" className="aop-workflow-back" onClick={backToClassWorkflowList}><ArrowLeft size={15}/> Back to class list</button>
        <div className="aop-workflow-step-heading"><span className="aop-step-pill">ALUMNI REVIEW</span><h3>Review students for alumni</h3><p>Select the students to mark as alumni. Their records are retained and their status becomes Inactive.</p></div>
        <section className="aop-panel">
          <div className="aop-workflow-summary">
            <div><span>Class</span><strong>{currentWorkflowGroup.label}</strong></div>
            <div><span>Active students</span><strong>{students.filter(student=>studentIsActive(student)&&classKey(student.className,student.section)===currentWorkflowGroup.key).length}</strong></div>
            <div><span>Selected</span><strong>{pickedCount}</strong></div>
          </div>
          <div className="aop-review-toolbar"><label className="aop-search"><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search students by name or ID"/></label></div>
          {renderWorkflowStudentRows(workflowReviewStudents,true,allWorkflowReviewStudentsSelected,toggleWorkflowVisibleReviewStudents)}
          <div className="aop-workflow-sticky-actions aop-alumni-sticky-actions"><span>{pickedCount} student(s) will be marked Alumni and Inactive</span><div><button type="button" className="aop-button" onClick={backToClassWorkflowList} disabled={saving}>Cancel</button><button type="button" className="aop-button primary" onClick={()=>void saveAlumniReview()} disabled={saving||loading||!pickedCount}><Users size={15}/>{saving?"Saving…":"Confirm Alumni"}</button></div></div>
        </section>
      </div>;
    }
    const actionLabel=isChange?"Choose Students":isPromote?"Review Promotion":"Review Alumni";
    const actionHandler=group=>isChange?openChangeClass(group):isPromote?openPromotionReview(group):openAlumniReview(group);
    const descriptionText=isChange
      ?"Choose a class, select the academic year and move selected students to another class."
      :isPromote
        ?"Review the next-year class mapping and promote eligible students together."
        :"Review and select students who are leaving the active student directory.";
    const summaryCards=isChange
      ?[{label:"Classes with active students",value:activeClassCount,icon:BookOpen,detail:"Available to change"},{label:"Active students",value:activeClassStudentCount,icon:Users,detail:"Across all classes"},{label:"Academic years",value:configuredYearOptions.length,icon:CalendarDays,detail:"Configured in school settings"}]
      :isPromote
        ?[{label:"Current academic year",value:currentAcademicYearLabel||"Not set",icon:CalendarDays,detail:"Promotion source year"},{label:"Next academic year",value:nextAcademicYearLabel(currentAcademicYearLabel)||"Not available",icon:GraduationCap,detail:years.some(year=>clean(year.label)===nextAcademicYearLabel(currentAcademicYearLabel))?"Configured":"Must be configured first"},{label:"Eligible students",value:students.filter(student=>studentIsActive(student)&&clean(student.academicYear)===currentAcademicYearLabel).length,icon:Users,detail:"In the current academic year"}]
        :[{label:"Classes with active students",value:activeClassCount,icon:BookOpen,detail:"Available for review"},{label:"Active students",value:activeClassStudentCount,icon:Users,detail:"Still enrolled"},{label:"Alumni records",value:alumniCount,icon:GraduationCap,detail:"Already designated alumni"}];
    return <div className="aop-class-workflow">
      <div className="aop-workflow-summary-cards">{summaryCards.map(card=>{const CardIcon=card.icon;return <div className="aop-workflow-stat-card" key={card.label}><span className="aop-workflow-stat-icon"><CardIcon size={18}/></span><div><span className="aop-workflow-stat-label">{card.label}</span><strong>{card.value}</strong><small>{card.detail}</small></div></div>;})}</div>
      <section className="aop-panel aop-class-workflow-list">
        <div className="aop-workflow-list-intro"><div><h3>Classes</h3><p>{descriptionText}</p></div><span className="aop-class-total">{visibleClassWorkflowGroups.length} class(es)</span></div>
        <div className="aop-toolbar"><label className="aop-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search by class or section…"/></label></div>
        <div className="aop-class-directory-grid">
          {visibleClassWorkflowGroups.length?visibleClassWorkflowGroups.map(group=><article className="aop-class-directory-card" key={group.key}>
            <div className="aop-class-card-top"><span className="aop-class-card-icon"><BookOpen size={18}/></span><span className="aop-class-card-badge">{group.count} active</span></div>
            <h4>{group.label}</h4><p>{group.count===1?"1 active student":group.count+" active students"}</p>
            <button type="button" className="aop-class-card-action" disabled={saving} onClick={()=>actionHandler(group)}>{actionLabel}<ArrowRight size={15}/></button>
          </article>):<div className="aop-empty-students">No classes match this search.</div>}
        </div>
      </section>
    </div>;
  }

  async function applyToSelected() {
    clearMessages();
    if(!selectedIds.length) return setError("Select at least one student.");
    const destination=selectedClass();
    if(["Change Class","Promote Class"].includes(title)&&!destination) return setError("Choose a destination class.");
    if(title==="Change House"&&!houseTarget) return setError("Choose a house.");
    if(title==="Promote Class"&&!clean(targetYear)) return setError("Choose the target academic year.");
    const verb=title==="Change Class"?"change class for":title==="Promote Class"?"promote":title==="Promote to Alumni"?"move to alumni / deactivate":title==="Change House"?"change house for":"update roll numbers for";
    if(!window.confirm("Are you sure you want to "+verb+" "+selectedIds.length+" selected student(s)?")) return;
    setSaving(true);clearMessages();
    let updated=0;const failures=[];
    try {
      for(const id of selectedIds) {
        const student=students.find(item=>String(item.id)===id);
        if(!student) { failures.push(id+": student no longer appears in the list"); continue; }
        let changes={};
        if(title==="Change Class") changes={className:destination.name,section:destination.section};
        if(title==="Promote Class") changes={className:destination.name,section:destination.section,academicYear:clean(targetYear)};
        if(title==="Promote to Alumni") changes={status:"Inactive"};
        if(title==="Change House") changes={house:houseTarget};
        try {
          const result=await apiPatch("/students/"+encodeURIComponent(id),changes);
          if(result?.student) setStudents(current=>current.map(item=>String(item.id)===id?result.student:{...item,...changes}));
          else setStudents(current=>current.map(item=>String(item.id)===id?{...item,...changes}:item));
          updated++;
        } catch(e) { failures.push((student.name||id)+": "+(e?.message||"update failed")); }
      }
      setSelectedIds([]);
      await loadPage({quiet:true});
      await onRefreshStudents?.();
      if(failures.length) setError(updated+" student(s) updated. "+failures.length+" update(s) failed: "+failures.slice(0,5).join(" | "));
      else flash(updated+" student(s) updated successfully.");
    } finally { setSaving(false); }
  }

  function startRollNumberEdit() {
    setRollDraft(Object.fromEntries(filteredStudents.map(student=>[String(student.id),String(student.rollNumber??"")])));
    setIsRollEditing(true);
    clearMessages();
  }

  function cancelRollNumberEdit() {
    setRollDraft({});
    setIsRollEditing(false);
  }

  function reorderNewRollNumbers() {
    clearMessages();
    if (!filteredStudents.length) return setError("No students are available to reorder.");
    const firstRoll = clean(filteredStudents[0]?.rollNumber);
    const numericStart = /^\d+$/.test(firstRoll) ? Number(firstRoll) : 1;
    const width = /^\d+$/.test(firstRoll) ? firstRoll.length : String(numericStart + filteredStudents.length - 1).length;
    const nextDraft = {};
    filteredStudents.forEach((student,index) => {
      nextDraft[String(student.id)] = String(numericStart + index).padStart(width,"0");
    });
    setRollDraft(current => ({...current,...nextDraft}));
    setIsRollEditing(true);
    flash("New roll numbers are arranged in sequence from "+String(numericStart)+". Review them and click Save Roll Numbers to apply.");
  }

  async function saveRollNumbers() {
    clearMessages();
    const changed=filteredStudents.filter(student=>String(rollDraft[String(student.id)]??student.rollNumber??"")!==String(student.rollNumber??""));
    if(!changed.length) return setError("No roll number changes to save.");
    if(changed.some(student=>!clean(rollDraft[String(student.id)]??student.rollNumber))) return setError("Roll Number cannot be blank for a changed student.");
    if(!window.confirm("Save roll number changes for "+changed.length+" student(s)?")) return;
    setSaving(true);let updated=0;const failures=[];
    try {
      for(const student of changed) {
        const id=String(student.id),rollNumber=clean(rollDraft[id]??student.rollNumber);
        try { await apiPatch("/students/"+encodeURIComponent(id),{rollNumber}); updated++; }
        catch(e){ failures.push((student.name||id)+": "+(e?.message||"update failed")); }
      }
      await loadPage({quiet:true}); await onRefreshStudents?.();
      if(failures.length) setError(updated+" roll number(s) saved. "+failures.length+" failed: "+failures.slice(0,5).join(" | "));
      else {
        setRollDraft({});
        setIsRollEditing(false);
        flash("Roll numbers updated for "+updated+" student(s).");
      }
    } finally { setSaving(false); }
  }

  function renderStudentsTable({showRollEditor=false,showRollNumber=false}={}) {
    return <div className="aop-table-wrap"><table className={"aop-table" + (showRollNumber ? " aop-roll-numbers-table" : "")}>
      <thead><tr>
        <th><button type="button" className="aop-select-all" onClick={toggleVisible}>{allVisibleSelected?<CheckSquare size={15}/>:<Square size={15}/>} Select</button></th>
        <th>Student</th><th>Class / Section</th><th>Academic Year</th>
        {showRollNumber ? <>
          <th>Roll Number</th>
          <th><div className="aop-roll-new-header"><span>New Roll Number</span><button type="button" className="aop-roll-reorder-button" title="Reorder new roll numbers in sequence" aria-label="Reorder new roll numbers in sequence" onClick={reorderNewRollNumbers} disabled={!filteredStudents.length||saving||loading||isRollEditing}><AlignJustify size={15}/></button></div></th>
        </> : showRollEditor ? <th>Roll Number</th> : <th>Status</th>}
      </tr></thead>
      <tbody>{filteredStudents.length?filteredStudents.map(student=><tr key={String(student.id)}>
        <td><input type="checkbox" aria-label={"Select "+student.name} checked={selectedIds.includes(String(student.id))} onChange={()=>toggleSelected(student.id)}/></td>
        <td><strong>{student.name||"Unnamed student"}</strong><small>{student.id}</small></td>
        <td>{clean(student.className)||"—"}{student.section?<small>Section {student.section}</small>:null}</td>
        <td>{clean(student.academicYear)||"—"}</td>
        {showRollNumber ? <>
          <td>{clean(student.rollNumber)||"—"}</td>
          <td>{showRollEditor
            ? <input className="aop-roll-input" value={rollDraft[String(student.id)]??student.rollNumber??""} onChange={event=>setRollDraft(current=>({...current,[String(student.id)]:event.target.value}))} aria-label={"New roll number for "+student.name}/>
            : <span className="aop-roll-preview-value" aria-label={"Proposed roll number for "+student.name}>{clean(rollDraft[String(student.id)]??student.rollNumber)||"—"}</span>}</td>
        </> : showRollEditor
          ? <td><input className="aop-roll-input" value={rollDraft[String(student.id)]??student.rollNumber??""} onChange={event=>setRollDraft(current=>({...current,[String(student.id)]:event.target.value}))} aria-label={"Roll number for "+student.name}/></td>
          : <td><span className={"aop-status "+(clean(student.status).toLowerCase()==="inactive"?"inactive":"active")}>{student.status||"Active"}</span></td>}
      </tr>):<tr><td colSpan={showRollNumber?6:5} className="aop-empty-cell">No students match the current filters.</td></tr>}</tbody>
    </table></div>;
  }

  function renderStudentOperation() {
    const isClassOperation=["Change Class","Promote Class"].includes(title);
    const isRoll=title==="Update Roll Numbers";
    return <>
      <section className="aop-panel">
        <div className="aop-toolbar">
          <label className="aop-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search students by name, ID or roll number" disabled={isRoll && isRollEditing}/></label>
          <label className="aop-field compact"><span>Class filter</span><select value={classFilter} onChange={event=>{setClassFilter(event.target.value);setSelectedIds([]);}} disabled={isRoll && isRollEditing}><option value="All classes">All classes</option>{classFilterOptions.map(option=><option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
          <label className="aop-field compact"><span>Academic year</span><select value={yearFilter} onChange={event=>{setYearFilter(event.target.value);setSelectedIds([]);}} disabled={isRoll && isRollEditing}><option>All years</option>{yearsLabels.map(value=><option key={value}>{value}</option>)}</select></label>
        </div>
        {isRoll&&<div className="aop-roll-sort-controls">
          <label className="aop-field"><span>Sort By</span><select value={rollSortBy} onChange={event=>setRollSortBy(event.target.value)} aria-label="Sort By" disabled={isRollEditing}>{ROLL_SORT_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="aop-field"><span>Then Sort By</span><select value={rollThenSortBy} onChange={event=>setRollThenSortBy(event.target.value)} aria-label="Then Sort By" disabled={isRollEditing}>{ROLL_SORT_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <p className="aop-roll-sort-note">The first option sets the main order. The second option sorts students within matching groups. When sorting by Gender, females appear before males.</p>
        </div>}
        {isClassOperation&&<div className="aop-target-fields">
          <label className="aop-field"><span>{title==="Promote Class"?"Promote into class":"Move selected students to class"}</span><select value={targetClassId} onChange={event=>setTargetClassId(event.target.value)}><option value="">Select class and section</option>{classChoices.map(item=><option key={item.id} value={item.id}>{classLabel(item)}</option>)}</select></label>
          {title==="Promote Class"&&<label className="aop-field"><span>Target academic year</span><select value={targetYear} onChange={event=>setTargetYear(event.target.value)}><option value="">Select academic year</option>{yearsLabels.map(year=><option key={year}>{year}</option>)}{!yearsLabels.includes(targetYear)&&targetYear&&<option>{targetYear}</option>}</select></label>}
        </div>}
        {title==="Change House"&&<div className="aop-target-fields"><label className="aop-field"><span>Assign house</span><select value={houseTarget} onChange={event=>setHouseTarget(event.target.value)}><option value="">Select house</option>{houses.filter(item=>item.status!=="Inactive").map(item=><option key={item.id} value={item.name}>{item.name}</option>)}</select>{!houses.length&&<small>Create a house from Manage House first.</small>}</label></div>}
        <div className="aop-table-heading"><strong>{filteredStudents.length} student(s)</strong>{isRoll
          ? isRollEditing
            ? <div className="aop-roll-top-actions">
                <button type="button" className="aop-button" disabled={saving} onClick={cancelRollNumberEdit}>Cancel</button>
                <button type="button" className="aop-button primary" disabled={saving||loading} onClick={()=>void saveRollNumbers()}><Save size={15}/>{saving?"Saving…":"Save Roll Numbers"}</button>
              </div>
            : <button type="button" className="aop-button primary aop-edit-roll-button" disabled={saving||loading||!filteredStudents.length} onClick={startRollNumberEdit}><Pencil size={14}/>Edit Roll Numbers</button>
          : <span>{selectedIds.length + " selected"}</span>}</div>
        {renderStudentsTable({showRollEditor:isRoll && isRollEditing,showRollNumber:isRoll})}
        <div className="aop-footer-actions">
          {isRoll
            ? isRollEditing
              ? <>
                  <button type="button" className="aop-button" disabled={saving} onClick={cancelRollNumberEdit}>Cancel</button>
                  <button type="button" className="aop-button primary" disabled={saving||loading} onClick={()=>void saveRollNumbers()}><Save size={15}/>{saving?"Saving…":"Save Roll Numbers"}</button>
                </>
              : <button type="button" className="aop-button primary aop-edit-roll-button" disabled={saving||loading||!filteredStudents.length} onClick={startRollNumberEdit}><Pencil size={14}/>Edit Roll Numbers</button>
            : <button type="button" className="aop-button primary" disabled={saving||loading||!selectedIds.length} onClick={()=>void applyToSelected()}><Save size={15}/>{saving?"Saving…":title==="Promote to Alumni"?"Promote Selected to Alumni":title==="Promote Class"?"Promote Selected Students":title==="Change House"?"Assign House to Selected":"Change Class for Selected"}</button>}
        </div>
      </section>
    </>;
  }

  function renderRecords() {
    const items=title==="Manage House"?houses:title==="Manage Marks Percentage for Leave Type"?rules:records;
    const key=title==="Manage House"?"name":title==="Manage Marks Percentage for Leave Type"?"leaveType":"className";
    return <div className="aop-record-layout">
      <section className="aop-panel">
        <div className="aop-panel-header"><div><h3>{editingId?"Edit record":"Add new record"}</h3><p>Changes are stored using the school's existing module-data storage.</p></div></div>
        <form className="aop-form" onSubmit={saveRecord}>
          {title==="Manage Marks Percentage for Leave Type"?<>
            <label className="aop-field"><span>Leave Type *</span><select value={recordForm.leaveType||""} onChange={event=>updateRecordForm("leaveType",event.target.value)} required>
              <option value="" disabled hidden>Select leave type</option>
              {recordForm.leaveType && !LEAVE_TYPE_OPTIONS.includes(recordForm.leaveType) && <option value={recordForm.leaveType}>{recordForm.leaveType}</option>}
              {LEAVE_TYPE_OPTIONS.map(option=><option key={option} value={option}>{option}</option>)}
            </select></label>
            <label className="aop-field"><span>Marks Percentage (0–100) *</span><input type="number" min="0" max="100" step="0.1" value={recordForm.marksPercentage??100} onChange={event=>updateRecordForm("marksPercentage",event.target.value)} required/></label>
            <label className="aop-field"><span>Notes</span><textarea value={recordForm.notes||""} onChange={event=>updateRecordForm("notes",event.target.value)} rows="3"/></label>
          </>:title==="Manage House"?<>
            <label className="aop-field"><span>House Name *</span><input value={recordForm.name||""} onChange={event=>updateRecordForm("name",event.target.value)} maxLength="100" required placeholder="e.g. Blue House"/></label>
            <label className="aop-field"><span>Description</span><textarea value={recordForm.description||""} onChange={event=>updateRecordForm("description",event.target.value)} rows="3"/></label>
            <label className="aop-field"><span>Theme colour</span><input type="color" value={recordForm.color||"#2563eb"} onChange={event=>updateRecordForm("color",event.target.value)}/></label>
            <label className="aop-field"><span>Status</span><select value={recordForm.status||"Active"} onChange={event=>updateRecordForm("status",event.target.value)}><option>Active</option><option>Inactive</option></select></label>
          </>:<>
            <label className="aop-field"><span>Class *</span><select value={recordForm.classId||""} onChange={event=>updateRecordForm("classId",event.target.value)} required><option value="">Select class</option>{eligibilityClassChoices.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="aop-field"><span>Eligible Birth Date — From</span><input type="date" value={recordForm.eligibleBirthDateFrom||""} onChange={event=>updateRecordForm("eligibleBirthDateFrom",event.target.value)}/></label>
            <label className="aop-field"><span>Eligible Birth Date — To</span><input type="date" value={recordForm.eligibleBirthDateTo||""} onChange={event=>updateRecordForm("eligibleBirthDateTo",event.target.value)}/></label>
            <label className="aop-field"><span>Notes</span><textarea value={recordForm.notes||""} onChange={event=>updateRecordForm("notes",event.target.value)} rows="3"/></label>
          </>}
          <div className="aop-footer-actions"><button type="button" className="aop-button" onClick={resetRecordForm} disabled={saving}>Clear</button><button type="submit" className="aop-button primary" disabled={saving}><Save size={15}/>{saving?"Saving…":editingId?"Save changes":"Add record"}</button></div>
        </form>
      </section>
      <section className="aop-panel">
        <div className="aop-panel-header"><div><h3>{title==="Manage House"?"School Houses":title==="Manage Marks Percentage for Leave Type"?"Leave Marks Percentage Rules":"Class Eligibility Criteria"}</h3><p>{items.length} saved record(s)</p></div></div>
        <div className="aop-table-wrap"><table className="aop-table"><thead><tr><th>{title==="Manage House"?"House":title==="Manage Marks Percentage for Leave Type"?"Leave Type":"Class"}</th><th>{title==="Manage House"?"Status":title==="Manage Marks Percentage for Leave Type"?"Marks %":"Eligible birth date range"}</th><th>Notes / Description</th><th>Actions</th></tr></thead><tbody>
          {items.length?items.map(item=><tr key={item.id}><td><strong>{item[key]||"—"}</strong>{title==="Manage House"&&item.color&&<small><span className="aop-color-swatch" style={{background:item.color}}/> {item.color}</small>}</td>
            <td>{title==="Manage House"?item.status||"Active":title==="Manage Marks Percentage for Leave Type"?String(item.marksPercentage)+"%":[item.eligibleBirthDateFrom||"Any",item.eligibleBirthDateTo||"Any"].join(" – ")}</td>
            <td>{item.notes||item.description||"—"}</td><td><div className="aop-row-actions"><button type="button" onClick={()=>editRecord(item)}><Pencil size={13}/> Edit</button><button type="button" className="danger" onClick={()=>void deleteRecord(item)} disabled={saving}><Trash2 size={13}/> Delete</button></div></td></tr>)
            :<tr><td colSpan="4" className="aop-empty-cell">No records yet. Add the first one using the form.</td></tr>}
        </tbody></table></div>
      </section>
    </div>;
  }

  function renderYears() {
    if(yearFormOpen) {
      return <section className="aop-panel aop-academic-year-editor">
        <div className="aop-panel-header"><div><h3>{editingYearId?"Edit Academic Year":"Add Academic Year"}</h3><p>Set the academic year dates and the numbering prefixes used by school documents.</p></div></div>
        <form className="aop-form" onSubmit={saveAcademicYear}>
          <label className="aop-field"><span>Label *</span><input value={yearForm.label} onChange={event=>setYearForm(current=>({...current,label:event.target.value}))} maxLength="30" placeholder="Academic Year Label" required/></label>
          <label className="aop-field"><span>From Date *</span><input type="date" value={yearForm.startDate} onChange={event=>setYearForm(current=>({...current,startDate:event.target.value}))} required/></label>
          <label className="aop-field"><span>To Date *</span><input type="date" value={yearForm.endDate} onChange={event=>setYearForm(current=>({...current,endDate:event.target.value}))} min={yearForm.startDate||undefined} required/></label>
          <label className="aop-field"><span>Fee Receipt Prefix</span><input value={yearForm.feeReceiptPrefix} onChange={event=>setYearForm(current=>({...current,feeReceiptPrefix:event.target.value}))} maxLength="80" placeholder="Fee Receipt Prefix"/></label>
          <label className="aop-field"><span>Invoice Prefix</span><input value={yearForm.invoicePrefix} onChange={event=>setYearForm(current=>({...current,invoicePrefix:event.target.value}))} maxLength="80" placeholder="Invoice Prefix"/></label>
          <p className="aop-prefix-note">Note: Trailing zeroes in the prefix are treated as padding. For example, a prefix of NUNG0000 will pad generated invoices with leading zeroes up to that length (e.g., NUNG0001, NUNG0002, etc.).</p>
          <label className="aop-field"><span>Admission Form Number Prefix</span><input value={yearForm.admissionFormNumberPrefix} onChange={event=>setYearForm(current=>({...current,admissionFormNumberPrefix:event.target.value}))} maxLength="80" placeholder="Admission Form Number Prefix"/></label>
          <label className="aop-field"><span>First Admission Form Number</span><input value={yearForm.firstAdmissionFormNumber} onChange={event=>setYearForm(current=>({...current,firstAdmissionFormNumber:event.target.value}))} maxLength="80" placeholder="First Admission Form Number"/></label>
          <div className="aop-footer-actions">
            <button type="button" className="aop-button" onClick={cancelAcademicYearEdit} disabled={saving}>Back to List</button>
            <button type="submit" className="aop-button primary" disabled={saving}><Save size={15}/>{saving?"Saving…":"Submit"}</button>
          </div>
        </form>
      </section>;
    }
    const formatRange=year=>{
      const start=academicDateLabel(year.start_date||year.startDate);
      const end=academicDateLabel(year.end_date||year.endDate);
      if(start==="—"&&end==="—") return "—";
      if(start==="—") return "Until "+end;
      if(end==="—") return "From "+start;
      return start+" - "+end;
    };
    return <section className="aop-panel aop-academic-year-list">
      <div className="aop-academic-year-list-top">
        <button type="button" className="aop-create-year-link" onClick={startNewAcademicYear}><Plus size={15}/> Create Academic Year</button>
        <span>{years.length} academic year(s)</span>
      </div>
      <div className="aop-table-wrap"><table className="aop-table aop-academic-years-table">
        <thead><tr><th className="aop-year-current-col" aria-label="Current academic year"></th><th>Label</th><th>Academic Year</th><th>Fee Receipt Prefix</th><th>Invoice Prefix</th><th>Admission Form Number Prefix</th><th>First Admission Form Number</th><th>Action</th></tr></thead>
        <tbody>{years.length?years.map(year=>{
          const current=Boolean(year.is_current??year.isCurrent);
          const settings=yearSettings[String(year.id)]||{};
          return <tr key={year.id}>
            <td className="aop-year-current-col"><input type="checkbox" aria-label={"Mark "+year.label+" as current academic year"} checked={current} disabled={saving} onChange={event=>void setCurrentAcademicYear(String(year.id),event.target.checked)}/></td>
            <td>{year.label||"—"}</td>
            <td>{formatRange(year)}</td>
            <td>{settings.feeReceiptPrefix||""}</td>
            <td>{settings.invoicePrefix||""}</td>
            <td>{settings.admissionFormNumberPrefix||""}</td>
            <td>{settings.firstAdmissionFormNumber||""}</td>
            <td><button type="button" className="aop-year-edit-link" onClick={()=>editAcademicYear(year)}>Edit</button></td>
          </tr>;
        }):<tr><td colSpan="8" className="aop-empty-cell">No academic years are configured yet. Select Create Academic Year to add one.</td></tr>}</tbody>
      </table></div>
    </section>;
  }

  const OperationIcon = Icon || (title==="Manage House"||title==="Change House"?Building2:title==="Manage Academic Year"?CalendarDays:Users);
  const isClassWorkflow=["Change Class","Promote Class","Promote to Alumni"].includes(title);
  const isStudentOperation=["Change House","Update Roll Numbers"].includes(title);
  const isRecordOperation=["Manage Marks Percentage for Leave Type","Manage House","Manage Class Eligibility Criteria"].includes(title);

  return <section className="academic-operation-page">
    <button type="button" className="aop-back" onClick={onBack}><ArrowLeft size={15}/>{text("Back to Manage your Branch")}</button>
    <header className="aop-heading">
      <div className="aop-heading-icon"><OperationIcon size={23}/></div>
      <div className="aop-heading-copy"><span>ACADEMICS · SCHOOL MANAGEMENT</span><h2>{text(title)}</h2><p>{text(description)}</p></div>
      <button type="button" className="aop-button" onClick={()=>void loadPage({quiet:true})} disabled={loading||saving}><RefreshCw size={14}/>{text("Refresh")}</button>
    </header>
    {error&&<div className="aop-message error" role="alert"><AlertCircle size={16}/><span>{error}</span><button type="button" onClick={()=>setError("")}>Dismiss</button></div>}
    {success&&<div className="aop-message success" role="status"><CheckCircle2 size={16}/><span>{success}</span></div>}
    {loading?<section className="aop-panel aop-loading"><RefreshCw size={20} className="aop-spin"/> Loading page data…</section>:<>
      {title==="Manage Academic Year"?renderYears():isClassWorkflow?renderClassWorkflow():isRecordOperation?renderRecords():isStudentOperation?renderStudentOperation():<section className="aop-panel"><p>This page is not configured for this operation.</p></section>}
    </>}
    <footer className="aop-footnote">Changes use existing school records or existing module-data storage. No database columns are added or changed.</footer>
  </section>;
}
