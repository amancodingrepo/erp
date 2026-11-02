import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, Award, BarChart3, BookOpen, CalendarDays, CheckCircle2,
  ClipboardList, Download, ExternalLink, FileText, Pencil, Plus, Printer, RefreshCw,
  Save, Search, Trash2, Users, X
} from "lucide-react";
import { apiGet, apiPut } from "../../../api.js";
import downloadModuleCsv from "../../../downloadModuleCsv.js";
import { getClassSubjectClassification, getClassSubjectOptions, summarizeSubjectPerformance } from "./subjectClassification.js";
import { studentOptionalSubjectContextKey } from "./optionalSubjectSelection.js";
import StudentOptionalSubjectsPanel from "./StudentOptionalSubjectsPanel.jsx";
import { getNavigationHref } from "../../../navigation.js";
import "./PerformanceReportPage.css";

const MODULE_KEY = "performance-report";
const ALL_YEARS = "__all_years__";

function clean(value) {
  return String(value == null ? "" : value).trim().replace(/\s+/g, " ");
}
function sectionKey(value) { return clean(value).replace(/^section\s*/i, "").toLocaleUpperCase(); }
function configuredClassLabel(item) { return clean(item?.displayName || [clean(item?.name), clean(item?.section)].filter(Boolean).join(" ")); }
function studentMatchesClassLabel(student, label, records) {
  const configured = (Array.isArray(records) ? records : []).find(item => item && configuredClassLabel(item) === clean(label));
  if (!configured) return clean(student?.className) === clean(label);
  return clean(student?.className) === clean(configured.name) && sectionKey(student?.section) === sectionKey(configured.section);
}
function configuredClassForStudent(student, records) {
  return (Array.isArray(records) ? records : []).find(item => item && item.status !== "Inactive" && clean(item.name) === clean(student?.className) && sectionKey(item.section) === sectionKey(student?.section));
}
function makeId(prefix) {
  return prefix + "-" + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9));
}
function todayKey() {
  const now = new Date();
  return String(now.getFullYear()) + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}
function academicYearNow() {
  const now = new Date();
  const start = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  return String(start) + "-" + String(start + 1);
}
function normalizeReportData(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    ...source,
    initialized: true,
    templates: Array.isArray(source.templates) ? source.templates.filter(item => item && item.id && item.name).map(item => ({
      ...item,
      id: String(item.id),
      name: clean(item.name),
      academicYear: clean(item.academicYear),
      terms: Array.isArray(item.terms) ? item.terms.map(clean).filter(Boolean) : [],
      subterms: Array.isArray(item.subterms) ? item.subterms.map(clean).filter(Boolean) : [],
      description: String(item.description || "")
    })) : [],
    exams: Array.isArray(source.exams) ? source.exams.filter(item => item && item.id && item.title).map(item => ({
      ...item,
      id: String(item.id),
      title: clean(item.title),
      academicYear: clean(item.academicYear),
      className: clean(item.className),
      subjectName: clean(item.subjectName),
      term: clean(item.term) || "General",
      maxMarks: Number(item.maxMarks) > 0 ? Number(item.maxMarks) : 100,
      passMarks: Number.isFinite(Number(item.passMarks)) ? Number(item.passMarks) : 35,
      examDate: clean(item.examDate),
      templateId: clean(item.templateId)
    })) : [],
    scores: Array.isArray(source.scores) ? source.scores.filter(item => item && item.examId && item.studentId).map(item => ({
      ...item,
      id: String(item.id || makeId("score")),
      examId: String(item.examId),
      studentId: String(item.studentId),
      marksObtained: Number(item.marksObtained),
      remarks: String(item.remarks || "")
    })).filter(item => Number.isFinite(item.marksObtained) && item.marksObtained >= 0) : []
  };
}
function gradeFor(percentage) {
  if (percentage == null || !Number.isFinite(percentage)) return { label: "Not assessed", className: "pr-chip-muted" };
  if (percentage >= 90) return { label: "A+", className: "pr-chip-green" };
  if (percentage >= 80) return { label: "A", className: "pr-chip-green" };
  if (percentage >= 70) return { label: "B", className: "pr-chip" };
  if (percentage >= 60) return { label: "C", className: "pr-chip" };
  if (percentage >= 50) return { label: "D", className: "pr-chip-amber" };
  if (percentage >= 35) return { label: "E", className: "pr-chip-amber" };
  return { label: "Needs support", className: "pr-chip-red" };
}
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(String(value).slice(0, 10) + "T00:00:00");
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}
function newExamForm(year, className, subjectName) {
  return {
    title: "",
    academicYear: year || academicYearNow(),
    className: className || "",
    subjectName: subjectName || "",
    term: "Term 1",
    maxMarks: "100",
    passMarks: "35",
    examDate: todayKey(),
    templateId: ""
  };
}

export default function PerformanceReportPage({ students = [], t }) {
  const text = typeof t === "function" ? t : value => value;
  const [reportData, setReportData] = useState({ initialized: true, templates: [], exams: [], scores: [] });
  const [assignedPerformanceSettings, setAssignedPerformanceSettings] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classRecords, setClassRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("performanceTab");
    return requested === "templates" ? "templates" : requested === "subjects" ? "subjects" : requested === "student-subjects" ? "studentSubjects" : requested === "studio" ? "studio" : "overview";
  });
  const [selectedExamId, setSelectedExamId] = useState("");
  const [editingExamId, setEditingExamId] = useState("");
  const [examForm, setExamForm] = useState(() => newExamForm("", "", ""));
  const [marksDraft, setMarksDraft] = useState({});
  const [marksSearch, setMarksSearch] = useState("");
  const [reportYear, setReportYear] = useState("");
  const [reportClass, setReportClass] = useState("All classes");
  const [reportTerm, setReportTerm] = useState("All terms");
  const [reportSearch, setReportSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSubjectClassId, setStudentSubjectClassId] = useState("");
  const [studentSubjectYear, setStudentSubjectYear] = useState(academicYearNow());
  const [studentSubjectSelectionCache, setStudentSubjectSelectionCache] = useState({});
  const [optionalSubjectRosterLoading, setOptionalSubjectRosterLoading] = useState(false);

  const availableClasses = useMemo(() => {
    const fromStudents = (students || []).map(student => {
      const configured = configuredClassForStudent(student, classRecords);
      return clean(configured ? configuredClassLabel(configured) : student.className);
    }).filter(Boolean);
    const fromSetup = classRecords.filter(item => item && item.status !== "Inactive" && !item.hiddenGrade)
      .map(item => clean(item.displayName || (clean(item.name) + (clean(item.section) ? " " + clean(item.section) : "")))).filter(Boolean);
    return Array.from(new Set([...fromStudents, ...fromSetup])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }, [students, classRecords]);

  const activeSubjects = useMemo(() => {
    return subjects.filter(item => item && clean(item.name) && item.status !== "Inactive")
      .map(item => ({ ...item, name: clean(item.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [subjects]);

  const examSubjectOptions = useMemo(() => getClassSubjectOptions(examForm.className, activeSubjects, classRecords), [examForm.className, activeSubjects, classRecords]);
  const examSubjectOption = examSubjectOptions.find(subject => subject.name.toLocaleLowerCase() === clean(examForm.subjectName).toLocaleLowerCase()) || null;
  const selectedExam = reportData.exams.find(item => item.id === selectedExamId) || null;
  const selectedExamSubjectClassification = selectedExam ? getClassSubjectClassification(selectedExam.className, selectedExam.subjectName, classRecords) : null;
  const subjectSetupRows = useMemo(() => classRecords.filter(item => item && item.status !== "Inactive")
    .flatMap(item => {
      const className = clean(item.displayName || [clean(item.name), clean(item.section)].filter(Boolean).join(" "));
      return (Array.isArray(item.subjectMappings) ? item.subjectMappings : []).filter(mapping => mapping && mapping.enabled !== false && clean(mapping.subjectName)).map(mapping => ({
        className, classId:String(item.id||""), subjectId:String(mapping.subjectId||""), subjectName:clean(mapping.subjectName),
        isOptional:Boolean(mapping.optional), teacherId:String(mapping.teacherId||""), extraCurricular:Boolean(mapping.extraCurricular),
        packageSubject:Boolean(mapping.packageSubject), language:Boolean(mapping.language)
      }));
    })
    .sort((a,b)=>a.className.localeCompare(b.className,undefined,{numeric:true})||a.subjectName.localeCompare(b.subjectName)),
  [classRecords]);

  const yearOptions = useMemo(() => {
    const years = [
      ...(students || []).map(student => clean(student.academicYear)),
      ...reportData.exams.map(item => clean(item.academicYear)),
      ...reportData.templates.map(item => clean(item.academicYear)),
      academicYearNow()
    ].filter(Boolean);
    return Array.from(new Set(years)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [students, reportData.exams, reportData.templates]);

  const resolvedReportYear = reportYear || yearOptions[0] || academicYearNow();
  const showAllYears = reportYear === ALL_YEARS;
  const selectedTemplate = reportData.templates.find(item => item.id === examForm.templateId) || null;
  const showTemplateMarks = Boolean(assignedPerformanceSettings?.showMarks);
  const showTemplateGrade = Boolean(assignedPerformanceSettings?.showGrade);
  const showTemplateRemarks = Boolean(assignedPerformanceSettings?.showRemarks);
  const showTemplatePhoto = Boolean(assignedPerformanceSettings?.showStudentPhoto);
  const assignedReportTitle = String(assignedPerformanceSettings?.reportTitle || "").trim();

  async function loadPage(quiet = false) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setLoadError("");
    setMessage("");
    try {
      const results = await Promise.allSettled([
        apiGet("/module-data/" + MODULE_KEY),
        apiGet("/school-subjects"),
        apiGet("/school-classes"),
        apiGet("/my-template-assignments"),
        apiGet("/module-data/subjects"),
        apiGet("/module-data/classes")
      ]);
      if (results[0].status === "rejected") throw results[0].reason;
      if (results[3].status === "rejected") throw results[3].reason;
      const baseLoadedData = normalizeReportData({ ...(results[0].value?.data || {}), templates: [] });
      const sourceAssignment = results[3].status === "fulfilled" ? results[3].value?.performanceReport : null;
      setAssignedPerformanceSettings(sourceAssignment?.performanceSettings || null);
      const assignedTemplate = sourceAssignment ? {
        id: String(sourceAssignment.id),
        name: clean(sourceAssignment.name),
        academicYear: clean(sourceAssignment.performanceSettings?.academicYear),
        terms: Array.isArray(sourceAssignment.terms) ? sourceAssignment.terms.map(clean).filter(Boolean) : [],
        subterms: Array.isArray(sourceAssignment.subterms) ? sourceAssignment.subterms.map(clean).filter(Boolean) : [],
        description: clean(sourceAssignment.description) || clean(sourceAssignment.performanceSettings?.reportTitle),
        adminAssigned: true,
        version: Number(sourceAssignment.version) || 1,
        appliedAt: sourceAssignment.appliedAt || ""
      } : null;
      const loadedData = normalizeReportData({
        ...baseLoadedData,
        templates: assignedTemplate ? [assignedTemplate] : []
      });
      setReportData(loadedData);
      const normalizedSubjects = results[1].status === "fulfilled" && Array.isArray(results[1].value?.subjects) ? results[1].value.subjects : null;
      const legacySubjects = results[4].status === "fulfilled" && Array.isArray(results[4].value?.data?.subjects) ? results[4].value.data.subjects : null;
      const normalizedClasses = results[2].status === "fulfilled" && Array.isArray(results[2].value?.classes) ? results[2].value.classes : null;
      const legacyClasses = results[5].status === "fulfilled" && Array.isArray(results[5].value?.data?.classes) ? results[5].value.data.classes : null;
      setSubjects(normalizedSubjects ?? legacySubjects ?? []);
      const loadedClasses = normalizedClasses ?? legacyClasses ?? [];
      setClassRecords(loadedClasses);
      setStudentSubjectClassId(current => current && loadedClasses.some(item => String(item.id || "") === current)
        ? current
        : (loadedClasses.find(item => item && item.id && item.status !== "Inactive" && (item.subjectMappings || []).some(mapping => mapping && mapping.enabled !== false && mapping.optional))?.id || ""));
      setSelectedExamId(current => loadedData.exams.some(item => item.id === current) ? current : (loadedData.exams[0]?.id || ""));
      if ((!normalizedSubjects && !legacySubjects) || (!normalizedClasses && !legacyClasses)) {
        setMessage("Reports loaded, but subject/class configuration is unavailable. Configure them in My Branch first.");
      }
    } catch (error) {
      setLoadError(error?.message || "Performance report data could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void loadPage(); }, []);

  useEffect(() => {
    if (!selectedExam || !selectedExamSubjectClassification?.isOptional) { setOptionalSubjectRosterLoading(false); return undefined; }
    const cls = classRecords.find(item => configuredClassLabel(item) === clean(selectedExam.className));
    if (!cls?.id) { setOptionalSubjectRosterLoading(false); return undefined; }
    const key = studentOptionalSubjectContextKey(cls.id, selectedExam.academicYear);
    if (studentSubjectSelectionCache[key]) { setOptionalSubjectRosterLoading(false); return undefined; }
    let cancelled = false;
    setOptionalSubjectRosterLoading(true);
    apiGet("/student-optional-subjects?classId=" + encodeURIComponent(cls.id) + "&academicYear=" + encodeURIComponent(selectedExam.academicYear))
      .then(result => {
        if (cancelled) return;
        const data = { class: result?.class || null, academicYear: String(result?.academicYear || selectedExam.academicYear), subjects: Array.isArray(result?.subjects) ? result.subjects : [], students: Array.isArray(result?.students) ? result.students : [] };
        setStudentSubjectSelectionCache(current => current[key] ? current : { ...current, [key]: data });
      })
      .catch(() => { /* no unverifiable optional marks roster */ })
      .finally(() => { if (!cancelled) setOptionalSubjectRosterLoading(false); });
    return () => { cancelled = true; };
  }, [selectedExam?.id, selectedExam?.className, selectedExam?.academicYear, selectedExamSubjectClassification?.isOptional, classRecords, studentSubjectSelectionCache]);

  useEffect(() => {
    setExamForm(current => ({
      ...current,
      academicYear: current.academicYear || yearOptions[0] || academicYearNow(),
      className: current.className || availableClasses[0] || "",
      subjectName: current.subjectName || activeSubjects[0]?.name || ""
    }));
  }, [yearOptions, availableClasses, activeSubjects]);

  useEffect(() => {
    if (!selectedExam) {
      setMarksDraft({});
      return;
    }
    const next = {};
    reportData.scores.filter(item => item.examId === selectedExam.id).forEach(item => {
      next[item.studentId] = { marks: String(item.marksObtained), remarks: String(item.remarks || "") };
    });
    setMarksDraft(next);
  }, [selectedExamId, reportData.scores]);

  const examRoster = useMemo(() => {
    if (!selectedExam) return [];
    let roster = (students || []).filter(student => {
      const status = clean(student.status).toLowerCase();
      const active = !status || status === "active";
      const classMatch = studentMatchesClassLabel(student, selectedExam.className, classRecords);
      const yearMatch = !clean(student.academicYear) || clean(student.academicYear) === selectedExam.academicYear;
      return active && classMatch && yearMatch;
    });
    if (selectedExamSubjectClassification?.isOptional) {
      const cls = classRecords.find(item => configuredClassLabel(item) === clean(selectedExam.className));
      if (!cls?.id) return [];
      const data = studentSubjectSelectionCache[studentOptionalSubjectContextKey(cls.id, selectedExam.academicYear)];
      if (!data) return [];
      const subject = data.subjects.find(item => clean(item.name).toLocaleLowerCase() === clean(selectedExam.subjectName).toLocaleLowerCase());
      if (!subject) return [];
      const eligible = new Set(data.students.filter(student => (student.selectedSubjectIds || []).map(String).includes(String(subject.id))).map(student => String(student.id)));
      roster = roster.filter(student => eligible.has(String(student.id)));
    }
    return roster.sort((a, b) => clean(a.rollNumber).localeCompare(clean(b.rollNumber), undefined, { numeric: true }) || clean(a.name).localeCompare(clean(b.name)));
  }, [students, selectedExam, selectedExamSubjectClassification?.isOptional, classRecords, studentSubjectSelectionCache]);

  const scoreCounts = useMemo(() => {
    const entered = examRoster.filter(student => marksDraft[String(student.id)] && clean(marksDraft[String(student.id)].marks) !== "").length;
    const passing = examRoster.filter(student => {
      const row = marksDraft[String(student.id)];
      return row && clean(row.marks) !== "" && Number(row.marks) >= Number(selectedExam?.passMarks || 0);
    }).length;
    return { entered, remaining: Math.max(0, examRoster.length - entered), passing };
  }, [examRoster, marksDraft, selectedExam]);

  const reportExams = useMemo(() => {
    return reportData.exams.filter(exam => {
      const yearMatch = showAllYears || !resolvedReportYear || exam.academicYear === resolvedReportYear;
      const classMatch = reportClass === "All classes" || exam.className === reportClass;
      const termMatch = reportTerm === "All terms" || exam.term === reportTerm;
      return yearMatch && classMatch && termMatch;
    });
  }, [reportData.exams, showAllYears, resolvedReportYear, reportClass, reportTerm]);

  const reportRows = useMemo(() => {
    const roster = (students || []).filter(student => {
      const yearMatch = showAllYears || !resolvedReportYear || !clean(student.academicYear) || clean(student.academicYear) === resolvedReportYear;
      const classMatch = reportClass === "All classes" || studentMatchesClassLabel(student, reportClass, classRecords);
      return yearMatch && classMatch;
    });
    const examById = Object.fromEntries(reportExams.map(exam => [exam.id, exam]));
    const rows = roster.map(student => {
      const id = String(student.id);
      const studentScores = reportData.scores.filter(score => score.studentId === id && examById[score.examId]);
      const obtained = studentScores.reduce((sum, score) => sum + Number(score.marksObtained || 0), 0);
      const maximum = studentScores.reduce((sum, score) => sum + Number(examById[score.examId]?.maxMarks || 0), 0);
      const percentage = maximum > 0 && studentScores.length ? obtained / maximum * 100 : null;
      const classified = summarizeSubjectPerformance(studentScores, examById, classRecords);
      return {
        student,id,obtained,maximum,percentage,
        primaryObtained:classified.primary.obtained,primaryMaximum:classified.primary.maximum,primaryPercentage:classified.primary.percentage,primaryAssessmentCount:classified.primary.count,
        optionalObtained:classified.optional.obtained,optionalMaximum:classified.optional.maximum,optionalPercentage:classified.optional.percentage,optionalAssessmentCount:classified.optional.count,
        unmappedObtained:classified.unmapped.obtained,unmappedMaximum:classified.unmapped.maximum,unmappedPercentage:classified.unmapped.percentage,unmappedAssessmentCount:classified.unmapped.count,
        assessmentCount:studentScores.length,grade:gradeFor(percentage),
        passedCount:studentScores.filter(score => Number(score.marksObtained)>=Number(examById[score.examId]?.passMarks||0)).length,
        assessments:studentScores.map(score=>{const exam=examById[score.examId];return {...score,exam,subjectType:getClassSubjectClassification(exam.className,exam.subjectName,classRecords).type};})
          .sort((a,b)=>clean(b.exam.examDate).localeCompare(clean(a.exam.examDate)))
      };
    }).sort((a,b)=>{
      if(a.percentage==null&&b.percentage!=null)return 1;
      if(a.percentage!=null&&b.percentage==null)return -1;
      return (b.percentage||0)-(a.percentage||0)||clean(a.student.name).localeCompare(clean(b.student.name));
    });
    let previousPercentage=null,previousRank=0;
    return rows.map((row,index)=>{
      let rank=null;
      if(row.percentage!=null){rank=previousPercentage===row.percentage?previousRank:index+1;previousPercentage=row.percentage;previousRank=rank;}
      return {...row,rank};
    });
  }, [students,reportExams,reportData.scores,showAllYears,resolvedReportYear,reportClass,classRecords]);

  const visibleReportRows = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    if (!query) return reportRows;
    return reportRows.filter(row => [
      row.student.name, row.id, row.student.rollNumber, row.student.className,
      row.student.section, row.student.father, row.student.parent
    ].some(value => String(value || "").toLowerCase().includes(query)));
  }, [reportRows, reportSearch]);

  const overallStats = useMemo(() => {
    const withResults = reportRows.filter(row => row.assessmentCount > 0);
    const primaryRows = reportRows.filter(row => row.primaryAssessmentCount > 0);
    const optionalRows = reportRows.filter(row => row.optionalAssessmentCount > 0);
    const average = withResults.length ? withResults.reduce((sum,row)=>sum+(row.percentage||0),0)/withResults.length : null;
    const primaryAverage = primaryRows.length ? primaryRows.reduce((sum,row)=>sum+(row.primaryPercentage||0),0)/primaryRows.length : null;
    const optionalAverage = optionalRows.length ? optionalRows.reduce((sum,row)=>sum+(row.optionalPercentage||0),0)/optionalRows.length : null;
    const passed = withResults.filter(row=>row.passedCount===row.assessmentCount).length;
    return {students:reportRows.length,exams:reportExams.length,withResults:withResults.length,average,primaryAverage,optionalAverage,passRate:withResults.length?passed/withResults.length*100:null};
  }, [reportRows, reportExams]);

  const classPerformance = useMemo(() => {
    const names = Array.from(new Set(reportRows.map(row => clean(row.student.className)).filter(Boolean)));
    return names.map(className => {
      const graded = reportRows.filter(row => clean(row.student.className) === className && row.percentage != null);
      const average = graded.length ? graded.reduce((sum, row) => sum + row.percentage, 0) / graded.length : null;
      return { className, average, students: reportRows.filter(row => clean(row.student.className) === className).length, assessed: graded.length };
    }).sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
  }, [reportRows]);

  const availableTerms = useMemo(() => {
    const templateTerms = reportData.templates
      .filter(item => showAllYears || !resolvedReportYear || !item.academicYear || item.academicYear === resolvedReportYear)
      .flatMap(item => item.terms || []);
    const examTerms = reportData.exams
      .filter(item => showAllYears || !resolvedReportYear || item.academicYear === resolvedReportYear)
      .map(item => item.term);
    return Array.from(new Set([...templateTerms, ...examTerms].map(clean).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [reportData.templates, reportData.exams, showAllYears, resolvedReportYear]);

  const selectedStudent = reportRows.find(row => row.id === selectedStudentId) || null;

  function updateExamForm(key, value) {
    setExamForm(current => ({ ...current, [key]: value }));
  }
  function updateExamClass(className) {
    const options = getClassSubjectOptions(className, activeSubjects, classRecords);
    setExamForm(current => ({
      ...current,
      className,
      subjectName: options.some(subject => subject.name.toLocaleLowerCase() === clean(current.subjectName).toLocaleLowerCase())
        ? current.subjectName : (options[0]?.name || "")
    }));
  }
  function chooseExamTemplate(templateId) {
    const template = reportData.templates.find(item => item.id === templateId);
    setExamForm(current => ({
      ...current,
      templateId,
      academicYear: template?.academicYear || current.academicYear,
      term: template?.terms?.[0] || current.term
    }));
  }

  async function persistData(nextValue, successMessage) {
    setSaving(true);
    setLoadError("");
    setMessage("");
    try {
      const normalized = normalizeReportData(nextValue);
      const assignedTemplateIds = new Set(
        normalized.templates.filter(item => item.adminAssigned).map(item => String(item.id))
      );
      const clientData = {
        ...normalized,
        exams: normalized.exams.map(exam =>
          assignedTemplateIds.has(String(exam.templateId))
            ? { ...exam, templateId: "" }
            : exam
        )
      };
      const persistedData = {
        ...clientData,
        templates: clientData.templates.filter(item => !item.adminAssigned)
      };
      await apiPut("/module-data/" + MODULE_KEY, { data: persistedData });
      setReportData(clientData);
      setMessage(successMessage || "Changes saved successfully.");
      return true;
    } catch (error) {
      setLoadError(error?.message || "Changes could not be saved. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveExam(event) {
    event.preventDefault();
    setLoadError("");
    setMessage("");
    const title = clean(examForm.title);
    const year = clean(examForm.academicYear);
    const className = clean(examForm.className);
    const subjectName = clean(examForm.subjectName);
    const term = clean(examForm.term) || "General";
    const maxMarks = Number(examForm.maxMarks);
    const passMarks = Number(examForm.passMarks);
    if (!title) return setLoadError("Assessment name is required.");
    if (!year) return setLoadError("Academic year is required.");
    if (!className) return setLoadError("Choose a class before creating an assessment.");
    if (!subjectName) return setLoadError("Subject name is required. Add a subject in My Branch or enter a custom subject.");
    if (!Number.isFinite(maxMarks) || maxMarks <= 0 || maxMarks > 100000) return setLoadError("Maximum marks must be greater than zero and at most 100,000.");
    if (!Number.isFinite(passMarks) || passMarks < 0 || passMarks > maxMarks) return setLoadError("Passing marks must be between zero and maximum marks.");
    const duplicate = reportData.exams.find(item =>
      item.id !== editingExamId && item.academicYear.toLowerCase() === year.toLowerCase() &&
      item.className.toLowerCase() === className.toLowerCase() &&
      item.subjectName.toLowerCase() === subjectName.toLowerCase() &&
      item.term.toLowerCase() === term.toLowerCase() &&
      item.title.toLowerCase() === title.toLowerCase()
    );
    if (duplicate) return setLoadError("This assessment already exists for the same year, class, subject and term.");
    const savedAt = new Date().toISOString();
    const existing = reportData.exams.find(item => item.id === editingExamId);
    const record = {
      ...(existing || {}),
      id: editingExamId || makeId("assessment"),
      title,
      academicYear: year,
      className,
      subjectName,
      term,
      maxMarks,
      passMarks,
      examDate: examForm.examDate || todayKey(),
      templateId: examForm.templateId || "",
      createdAt: existing?.createdAt || savedAt,
      updatedAt: savedAt
    };
    const nextData = {
      ...reportData,
      exams: editingExamId
        ? reportData.exams.map(item => item.id === editingExamId ? record : item)
        : [...reportData.exams, record]
    };
    if (await persistData(nextData, editingExamId ? "Assessment updated successfully." : "Assessment created successfully.")) {
      setSelectedExamId(record.id);
      setEditingExamId("");
      setExamForm(newExamForm(year, className, activeSubjects[0]?.name || subjectName));
    }
  }

  function startEditExam(exam) {
    setEditingExamId(exam.id);
    setSelectedExamId(exam.id);
    setExamForm({
      title: exam.title,
      academicYear: exam.academicYear,
      className: exam.className,
      subjectName: exam.subjectName,
      term: exam.term,
      maxMarks: String(exam.maxMarks),
      passMarks: String(exam.passMarks),
      examDate: exam.examDate || todayKey(),
      templateId: exam.templateId || ""
    });
    setActiveTab("marks");
    setMessage("");
    setLoadError("");
  }

  function cancelEditExam() {
    setEditingExamId("");
    setExamForm(newExamForm(resolvedReportYear, availableClasses[0] || "", activeSubjects[0]?.name || ""));
    setLoadError("");
    setMessage("");
  }

  async function deleteExam(exam) {
    if (!window.confirm("Delete " + exam.title + " and all marks stored for this assessment? This cannot be undone.")) return;
    const nextData = {
      ...reportData,
      exams: reportData.exams.filter(item => item.id !== exam.id),
      scores: reportData.scores.filter(item => item.examId !== exam.id)
    };
    if (await persistData(nextData, "Assessment and its marks deleted.")) {
      if (selectedExamId === exam.id) setSelectedExamId(nextData.exams[0]?.id || "");
      if (editingExamId === exam.id) cancelEditExam();
    }
  }

  function updateMark(studentId, key, value) {
    const id = String(studentId);
    setMarksDraft(current => ({
      ...current,
      [id]: { marks: current[id]?.marks ?? "", remarks: current[id]?.remarks ?? "", [key]: value }
    }));
  }

  async function saveMarks() {
    if (!selectedExam) {
      setLoadError("Create or choose an assessment before saving marks.");
      return;
    }
    if (!examRoster.length) {
      setLoadError("There are no active students in the selected class and academic year.");
      return;
    }
    const rosterIds = new Set(examRoster.map(student => String(student.id)));
    const nextScores = [];
    for (const student of examRoster) {
      const draft = marksDraft[String(student.id)] || {};
      const raw = clean(draft.marks);
      if (!raw) continue;
      const marks = Number(raw);
      if (!Number.isFinite(marks) || marks < 0 || marks > selectedExam.maxMarks) {
        setLoadError("Marks for " + (student.name || student.id) + " must be between 0 and " + selectedExam.maxMarks + ".");
        return;
      }
      nextScores.push({
        id: makeId("score"),
        examId: selectedExam.id,
        studentId: String(student.id),
        marksObtained: marks,
        remarks: String(draft.remarks || "").trim(),
        updatedAt: new Date().toISOString()
      });
    }
    const preservedScores = reportData.scores.filter(score => score.examId !== selectedExam.id || !rosterIds.has(String(score.studentId)));
    const nextData = { ...reportData, scores: [...preservedScores, ...nextScores] };
    if (await persistData(nextData, "Marks saved for " + nextScores.length + " student(s). Blank marks remain unassessed.")) {
      setMarksDraft(current => {
        const next = { ...current };
        examRoster.forEach(student => {
          const prior = next[String(student.id)] || {};
          next[String(student.id)] = { ...prior, marks: clean(prior.marks) === "" ? "" : String(Number(prior.marks)) };
        });
        return next;
      });
    }
  }

  function useTemplate(template) {
    setExamForm(current => ({
      ...current,
      templateId: template.id,
      academicYear: template.academicYear || current.academicYear,
      term: template.terms?.[0] || current.term
    }));
    setActiveTab("marks");
    setMessage("Template selected. Choose the class, subject and assessment name to continue.");
    setLoadError("");
  }

  function exportReport() {
    const headers = ["Rank", "Student ID", "Student Name", "Class", "Academic Year", "Assessments Entered"];
    if (showTemplateMarks) headers.push("Marks Obtained", "Maximum Marks");
    headers.push("Combined Percentage", "Primary / Compulsory Percentage", "Optional Percentage", "Unmapped Subject Percentage");
    if (showTemplateGrade) headers.push("Combined Grade");
    headers.push("Parent", "Parent Phone");
    const rows = [headers];
    visibleReportRows.forEach(row => {
      const values = [
        row.rank == null ? "" : row.rank,
        row.id,
        row.student.name || "",
        row.student.className || "",
        row.student.academicYear || resolvedReportYear,
        row.assessmentCount
      ];
      if (showTemplateMarks) values.push(row.obtained, row.maximum);
      values.push(row.percentage == null ? "" : row.percentage.toFixed(2),
        row.primaryPercentage == null ? "" : row.primaryPercentage.toFixed(2),
        row.optionalPercentage == null ? "" : row.optionalPercentage.toFixed(2),
        row.unmappedPercentage == null ? "" : row.unmappedPercentage.toFixed(2));
      if (showTemplateGrade) values.push(row.grade.label);
      values.push(row.student.parent || row.student.father || "", row.student.phone || "");
      rows.push(values);
    });
    downloadModuleCsv("school-world-performance-report.csv", rows);
  }

  function exportMarks(exam) {
    const scoresByStudent = Object.fromEntries(reportData.scores.filter(item => item.examId === exam.id).map(item => [item.studentId, item]));
    const rows = [["Student ID", "Student Name", "Class", "Subject", "Assessment", "Academic Year", "Term", "Marks Obtained", "Maximum Marks", "Percentage", "Passing Marks", "Remarks"]];
    examRoster.forEach(student => {
      const score = scoresByStudent[String(student.id)];
      rows.push([
        student.id, student.name, student.className, exam.subjectName, exam.title,
        exam.academicYear, exam.term, score?.marksObtained ?? "", exam.maxMarks,
        score ? (Number(score.marksObtained) / exam.maxMarks * 100).toFixed(2) : "",
        exam.passMarks, score?.remarks || ""
      ]);
    });
    downloadModuleCsv("school-world-marks-" + exam.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".csv", rows);
  }

  function printReport() {
    window.print();
  }

  const filteredMarksRoster = useMemo(() => {
    const query = marksSearch.trim().toLowerCase();
    if (!query) return examRoster;
    return examRoster.filter(student => [student.name, student.id, student.rollNumber, student.enrollmentNumber]
      .some(value => String(value || "").toLowerCase().includes(query)));
  }, [examRoster, marksSearch]);

  const tabs = [
    { id: "overview", label: "Performance Overview", Icon: BarChart3 },
    { id: "marks", label: "Assessments & Marks", Icon: ClipboardList },
    { id: "subjects", label: "Subject Configuration", Icon: BookOpen },
    { id: "studentSubjects", label: "Student Optional Subjects", Icon: Users },
    { id: "templates", label: "Report Templates", Icon: FileText },
    { id: "studio", label: "Proforma Studio Preview", Icon: ExternalLink }
  ];

  return (
    <section className="performance-report-workspace">
      <div className="pr-intro">
        <div className="pr-intro-copy">
          <p className="pr-eyebrow">{text("ACADEMICS · STUDENT OUTCOMES")}</p>
          <h2>{text("Student Performance Centre")}</h2>
          <p>{text("Set up assessments, enter marks, manage report templates and review class-wise and student-wise academic results. Saved records are scoped to your school and persist through the existing module-data service.")}</p>
        </div>
        <div className="pr-intro-actions">
          <a className="pr-button pr-button-primary" href={getNavigationHref({ module: "My Branch", branchPage: "Manage Classes" })}><BookOpen size={15}/>{text("Configure subjects")}</a>
          <button type="button" className="pr-button" onClick={() => void loadPage(true)} disabled={loading || refreshing || saving}>
            <RefreshCw size={15} className={refreshing ? "pr-icon-spin" : ""}/>{text("Refresh")}
          </button>
          <button type="button" className="pr-button" onClick={printReport}><Printer size={15}/>{text("Print report")}</button>
        </div>
      </div>

      <div className="pr-tabs" role="tablist" aria-label={text("Performance report sections")}>
        {tabs.map(tab => (
          <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id}
            className={"pr-tab" + (activeTab === tab.id ? " is-active" : "")}
            onClick={() => { setActiveTab(tab.id); setLoadError(""); setMessage(""); }}>
            <tab.Icon size={17}/>{text(tab.label)}
          </button>
        ))}
      </div>

      {loadError && <div className="pr-notice pr-notice-error" role="alert"><X size={17}/><span>{loadError}</span></div>}
      {message && <div className="pr-notice pr-notice-success" role="status"><CheckCircle2 size={17}/><span>{message}</span></div>}

      {loading ? (
        <div className="pr-panel"><div className="pr-loading"><span className="pr-spinner"/>{text("Loading performance data from the school database…")}</div></div>
      ) : (
        <>
          {activeTab === "overview" && (
            <>
              <div className="pr-stat-grid">
                <div className="pr-stat-card blue"><span>{text("Students in report")}</span><strong>{overallStats.students}</strong><small>{text("Based on the selected class and academic year")}</small></div>
                <div className="pr-stat-card violet"><span>{text("Assessments")}</span><strong>{overallStats.exams}</strong><small>{text("Assessments included in these filters")}</small></div>
                <div className="pr-stat-card green"><span>{text("Students with marks")}</span><strong>{overallStats.withResults}</strong><small>{text("Students with at least one saved result")}</small></div>
                <div className="pr-stat-card amber"><span>{text("Combined average")}</span><strong>{overallStats.average == null ? "—" : overallStats.average.toFixed(1) + "%"}</strong><small>{text("Primary avg: ")}{overallStats.primaryAverage == null ? "—" : overallStats.primaryAverage.toFixed(1) + "%"} · {text("Optional avg: ")}{overallStats.optionalAverage == null ? "—" : overallStats.optionalAverage.toFixed(1) + "%"}</small></div>
              </div>

              <section className="pr-panel">
                <div className="pr-panel-header">
                  <div><h3>{text(assignedReportTitle || "Performance report filters")}</h3><p>{text("Filter the report, then export or open a student's assessment details.")}</p></div>
                  <div className="pr-inline-meta"><span className="pr-chip">{reportExams.length} {text("assessments")}</span><span className="pr-chip pr-chip-muted">{visibleReportRows.length} {text("students shown")}</span></div>
                </div>
                <div className="pr-filters">
                  <label className="pr-field">{text("Academic year")}
                    <select value={showAllYears ? ALL_YEARS : resolvedReportYear} onChange={event => { setReportYear(event.target.value); setSelectedStudentId(""); }}>
                      <option value={ALL_YEARS}>{text("All academic years")}</option>
                      {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>
                  <label className="pr-field">{text("Class")}
                    <select value={reportClass} onChange={event => { setReportClass(event.target.value); setSelectedStudentId(""); }}>
                      <option value="All classes">{text("All classes")}</option>
                      {availableClasses.map(className => <option key={className} value={className}>{className}</option>)}
                    </select>
                  </label>
                  <label className="pr-field">{text("Term")}
                    <select value={reportTerm} onChange={event => { setReportTerm(event.target.value); setSelectedStudentId(""); }}>
                      <option value="All terms">{text("All terms")}</option>
                      {availableTerms.map(term => <option key={term} value={term}>{term}</option>)}
                    </select>
                  </label>
                  <div className="pr-field"><span>{text("Report actions")}</span>
                    <div className="pr-inline-meta">
                      <button type="button" className="pr-button pr-button-primary" onClick={exportReport}><Download size={15}/>{text("Export CSV")}</button>
                      <button type="button" className="pr-button" onClick={printReport}><Printer size={15}/>{text("Print")}</button>
                    </div>
                  </div>
                </div>
                <div className="pr-toolbar">
                  <div className="pr-search"><Search size={15}/><input value={reportSearch} onChange={event => setReportSearch(event.target.value)} placeholder={text("Search student, roll number or ID…")} aria-label={text("Search performance report")}/></div>
                  <span className="pr-field-help">{text("Combined average includes all recorded subjects. Primary / compulsory and optional averages are shown separately when class subject mappings are configured.")}</span>
                </div>
                <div className="pr-table-wrap">
                  <table className="pr-table">
                    <thead><tr><th>{text("Rank")}</th><th>{text("Student")}</th><th>{text("Class")}</th><th>{text("Assessments")}</th>{showTemplateMarks && <th>{text("Marks")}</th>}<th>{text("Combined avg")}</th><th>{text("Primary avg")}</th><th>{text("Optional avg")}</th>{showTemplateGrade && <th>{text("Combined grade")}</th>}<th>{text("Details")}</th></tr></thead>
                    <tbody>
                      {visibleReportRows.length ? visibleReportRows.map(row => (
                        <tr key={row.id}>
                          <td>{row.rank == null ? "—" : <strong>#{row.rank}</strong>}</td>
                          <td><button type="button" className="pr-student-open" onClick={() => setSelectedStudentId(current => current === row.id ? "" : row.id)}>{showTemplatePhoto && (row.student.photoDataUrl || row.student.photoUrl || row.student.photo) && <img src={row.student.photoDataUrl || row.student.photoUrl || row.student.photo} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 7, marginRight: 8, verticalAlign: "middle" }} />}{row.student.name || text("Unnamed student")}<span className="pr-secondary">{row.id}{row.student.rollNumber ? " · " + text("Roll") + " " + row.student.rollNumber : ""}</span></button></td>
                          <td>{row.student.className || "—"}{row.student.section ? <span className="pr-secondary">{text("Section")} {row.student.section}</span> : null}</td>
                          <td>{row.assessmentCount} / {reportExams.length}</td>
                          {showTemplateMarks && <td>{row.assessmentCount ? Number(row.obtained).toFixed(1).replace(/\.0$/, "") + " / " + Number(row.maximum).toFixed(1).replace(/\.0$/, "") : "—"}</td>}
                          <td>{row.percentage == null ? <span className="pr-chip pr-chip-muted">{text("Not assessed")}</span> : <div className="pr-progress-line"><div className="pr-progress-track"><i style={{ width: Math.max(0, Math.min(100, row.percentage)) + "%" }}/></div><strong>{row.percentage.toFixed(1)}%</strong></div>}</td>
                          <td>{row.primaryPercentage == null ? "—" : <span className="pr-subject-average">{row.primaryPercentage.toFixed(1)}%</span>}</td>
                          <td>{row.optionalPercentage == null ? "—" : <span className="pr-subject-average optional">{row.optionalPercentage.toFixed(1)}%</span>}</td>
                          {showTemplateGrade && <td><span className={"pr-chip " + row.grade.className}>{text(row.grade.label)}</span></td>}
                          <td><button className="pr-button pr-button-small" type="button" onClick={() => setSelectedStudentId(current => current === row.id ? "" : row.id)}>{selectedStudentId === row.id ? text("Hide") : text("View")}</button></td>
                        </tr>
                      )) : <tr><td className="pr-table-empty" colSpan={8 + (showTemplateMarks ? 1 : 0) + (showTemplateGrade ? 1 : 0)}>{text("No students match these filters. Import student records or adjust the report filters.")}</td></tr>}
                    </tbody>
                  </table>
                </div>
                {assignedPerformanceSettings?.footerText && <p className="pr-field-help" style={{ margin: "14px 0 0" }}>{assignedPerformanceSettings.footerText}</p>}
              </section>

              {selectedStudent && (
                <section className="pr-panel">
                  <div className="pr-panel-header">
                    <div><h3>{text("Assessment details")} · {selectedStudent.student.name}</h3><p>{selectedStudent.id} · {selectedStudent.student.className || text("Class not assigned")} · {selectedStudent.assessmentCount} {text("results recorded")}</p></div>
                    <button type="button" className="pr-button pr-button-small" onClick={() => setSelectedStudentId("")}><X size={14}/>{text("Close details")}</button>
                  </div>
                  <div className="pr-table-wrap"><table className="pr-table">
                    <thead><tr><th>{text("Assessment")}</th><th>{text("Subject")}</th><th>{text("Subject type")}</th><th>{text("Term")}</th><th>{text("Date")}</th>{showTemplateMarks && <th>{text("Marks")}</th>}<th>{text("Percentage")}</th>{showTemplateRemarks && <th>{text("Remarks")}</th>}</tr></thead>
                    <tbody>
                      {selectedStudent.assessments.length ? selectedStudent.assessments.map(item => (
                        <tr key={item.id}><td><strong>{item.exam.title}</strong><span className="pr-secondary">{item.exam.academicYear}</span></td><td>{item.exam.subjectName}</td><td><span className={"pr-chip " + (item.subjectType === "Optional" ? "pr-chip-amber" : item.subjectType === "Primary / Compulsory" ? "pr-chip-green" : "pr-chip-muted")}>{text(item.subjectType)}</span></td><td>{item.exam.term}</td><td>{formatDate(item.exam.examDate)}</td>{showTemplateMarks && <td>{item.marksObtained} / {item.exam.maxMarks}</td>}<td>{(item.marksObtained / item.exam.maxMarks * 100).toFixed(1)}%</td>{showTemplateRemarks && <td>{item.remarks || "—"}</td>}</tr>
                      )) : <tr><td colSpan={6 + (showTemplateMarks ? 1 : 0) + (showTemplateRemarks ? 1 : 0)} className="pr-table-empty">{text("No marks have been entered for this student in the selected report filters.")}</td></tr>}
                    </tbody>
                  </table></div>
                </section>
              )}

              <section className="pr-panel">
                <div className="pr-panel-header"><div><h3>{text("Class-wise performance")}</h3><p>{text("Average percentage uses students who have saved marks in the selected report filters.")}</p></div></div>
                <div className="pr-panel-body">
                  {classPerformance.length ? <div className="pr-class-bars">
                    {classPerformance.map(item => <div className="pr-class-bar-row" key={item.className}>
                      <span className="pr-class-bar-label">{item.className}</span>
                      <div className="pr-class-bar-track" title={item.average == null ? text("No marks entered") : item.average.toFixed(1) + "%"}><i style={{ width: (item.average == null ? 0 : Math.max(0, Math.min(100, item.average))) + "%" }}/></div>
                      <strong>{item.average == null ? "—" : item.average.toFixed(1) + "%"}</strong>
                    </div>)}
                  </div> : <p className="pr-field-help">{text("Class performance will appear after student records are added.")}</p>}
                </div>
              </section>
            </>
          )}

          {activeTab === "marks" && (
            <>
              <section className="pr-panel">
                <div className="pr-panel-header">
                  <div><h3>{editingExamId ? text("Edit assessment") : text("Create assessment")}</h3><p>{text("An assessment links a class, subject, term, academic year and maximum/passing marks. No database columns are added.")}</p></div>
                  <span className="pr-chip">{reportData.exams.length} {text("saved assessments")}</span>
                </div>
                <div className="pr-panel-body">
                  <form onSubmit={saveExam}>
                    <div className="pr-form-grid">
                      <label className="pr-field">{text("Assessment name")}<input value={examForm.title} onChange={event => updateExamForm("title", event.target.value)} maxLength="120" placeholder={text("e.g. Mathematics Unit Test 1")} required/></label>
                      <label className="pr-field">{text("Academic year")}<input value={examForm.academicYear} onChange={event => updateExamForm("academicYear", event.target.value)} maxLength="30" placeholder="2026-2027" required/></label>
                      <label className="pr-field">{text("Class")}<select value={examForm.className} onChange={event => updateExamClass(event.target.value)} required><option value="">{text("Select class")}</option>{availableClasses.map(className => <option key={className} value={className}>{className}</option>)}</select>{!availableClasses.length && <span className="pr-field-help">{text("Add students or configure classes in My Branch first.")}</span>}</label>
                      <label className="pr-field">{text("Report template (optional)")}<select value={examForm.templateId} onChange={event => chooseExamTemplate(event.target.value)}><option value="">{text("No template selected")}</option>{reportData.templates.map(template => <option key={template.id} value={template.id}>{template.name}{template.academicYear ? " · " + template.academicYear : " · Database"}</option>)}</select>{selectedTemplate && <span className="pr-field-help">{text("Template terms: ")}{selectedTemplate.terms.join(", ")}</span>}</label>
                      <label className="pr-field">{text("Subject")}
                        <select value={examSubjectOptions.some(subject => subject.name.toLocaleLowerCase() === clean(examForm.subjectName).toLocaleLowerCase()) ? examForm.subjectName : "__custom__"} onChange={event => updateExamForm("subjectName", event.target.value === "__custom__" ? "" : event.target.value)}>
                          <option value="__custom__">{text("Other / enter manually")}</option>
                          {examSubjectOptions.map(subject => <option key={subject.id || subject.name} value={subject.name}>{subject.name}{subject.code ? " (" + subject.code + ")" : ""} · {subject.mapped ? (subject.optional ? text("Optional") : text("Primary / Compulsory")) : text("Not mapped to class")}</option>)}
                        </select>
                        {!examSubjectOptions.some(subject => subject.name.toLocaleLowerCase() === clean(examForm.subjectName).toLocaleLowerCase()) && <input style={{ marginTop: 7 }} value={examForm.subjectName} onChange={event => updateExamForm("subjectName", event.target.value)} maxLength="120" placeholder={text("Enter subject name")} required/>}
                        {examSubjectOption ? <span className="pr-field-help">{text("Subject type: ")}{text(examSubjectOption.mapped ? (examSubjectOption.optional ? "Optional" : "Primary / Compulsory") : "Not mapped to this class")}{!examSubjectOption.mapped ? text(". Configure it in My Branch → Manage Classes.") : ""}</span> : <span className="pr-field-help">{text("Custom subjects are unclassified until mapped in My Branch → Manage Classes.")}</span>}
                      </label>
                      <label className="pr-field">{text("Term / subterm")}<input value={examForm.term} onChange={event => updateExamForm("term", event.target.value)} list="pr-term-options" maxLength="80" placeholder={text("e.g. Term 1 · Mid-term")}/><datalist id="pr-term-options">{(selectedTemplate?.terms || availableTerms).map(term => <option key={term} value={term}/>)}</datalist></label>
                      <label className="pr-field">{text("Maximum marks")}<input type="number" min="0.1" max="100000" step="0.5" value={examForm.maxMarks} onChange={event => updateExamForm("maxMarks", event.target.value)} required/></label>
                      <label className="pr-field">{text("Passing marks")}<input type="number" min="0" max={Number(examForm.maxMarks) || 100000} step="0.5" value={examForm.passMarks} onChange={event => updateExamForm("passMarks", event.target.value)} required/></label>
                      <label className="pr-field">{text("Assessment date")}<input type="date" value={examForm.examDate} onChange={event => updateExamForm("examDate", event.target.value)}/></label>
                    </div>
                    <div className="pr-form-actions">
                      {editingExamId && <button type="button" className="pr-button" onClick={cancelEditExam} disabled={saving}>{text("Cancel edit")}</button>}
                      <button type="submit" className="pr-button pr-button-primary" disabled={saving || loading}><Save size={15}/>{saving ? text("Saving…") : editingExamId ? text("Save assessment") : text("Create assessment")}</button>
                    </div>
                  </form>
                </div>
              </section>

              <div className="pr-exam-layout">
                <section className="pr-panel">
                  <div className="pr-panel-header"><div><h3>{text("Assessment list")}</h3><p>{text("Select an assessment to enter or update student marks.")}</p></div></div>
                  <div className="pr-exam-list">
                    {reportData.exams.slice().sort((a, b) => clean(b.examDate).localeCompare(clean(a.examDate))).map(exam => (
                      <article className={"pr-exam-card" + (exam.id === selectedExamId ? " is-selected" : "")} key={exam.id}>
                        <div className="pr-exam-card-title"><strong>{exam.title}</strong><span className="pr-chip pr-chip-muted">{exam.term}</span></div>
                        <div className="pr-exam-card-meta"><span>{exam.className}</span><span>·</span><span>{exam.subjectName}</span><span>·</span><span className={"pr-chip " + (getClassSubjectClassification(exam.className, exam.subjectName, classRecords).type === "Optional" ? "pr-chip-amber" : getClassSubjectClassification(exam.className, exam.subjectName, classRecords).type === "Primary / Compulsory" ? "pr-chip-green" : "pr-chip-muted")}>{text(getClassSubjectClassification(exam.className, exam.subjectName, classRecords).type)}</span></div>
                        <div className="pr-exam-card-meta"><span>{exam.academicYear}</span><span>·</span><span>{formatDate(exam.examDate)}</span><span>·</span><span>{exam.maxMarks} {text("marks")}</span></div>
                        <div className="pr-exam-card-actions">
                          <button type="button" className="pr-button pr-button-primary pr-button-small" onClick={() => { setSelectedExamId(exam.id); setEditingExamId(""); setMarksSearch(""); setMessage(""); setLoadError(""); }}><ClipboardList size={13}/>{text("Enter marks")}</button>
                          <button type="button" className="pr-button pr-button-small" onClick={() => startEditExam(exam)}><Pencil size={13}/>{text("Edit")}</button>
                          <button type="button" className="pr-button pr-button-danger pr-button-small" onClick={() => void deleteExam(exam)} disabled={saving}><Trash2 size={13}/>{text("Delete")}</button>
                        </div>
                      </article>
                    ))}
                    {!reportData.exams.length && <div className="pr-table-empty">{text("No assessments yet. Create the first assessment above.")}</div>}
                  </div>
                </section>

                <section className="pr-panel">
                  <div className="pr-panel-header">
                    <div><h3>{selectedExam ? text("Enter student marks") : text("Marks register")}</h3><p>{selectedExam ? selectedExam.title + " · " + selectedExam.className + " · " + selectedExam.subjectName : text("Choose an assessment from the list to start entering marks.")}</p></div>
                    {selectedExam && <button type="button" className="pr-button pr-button-small" onClick={() => exportMarks(selectedExam)}><Download size={14}/>{text("Export marks")}</button>}
                  </div>
                  {selectedExam ? (
                    <>
                      <div className="pr-marks-summary"><span><Users size={15}/>{examRoster.length} {text("active students")}</span><span><CheckCircle2 size={15}/>{scoreCounts.entered} {text("entered")}</span><span>{scoreCounts.remaining} {text("remaining")}</span><span>{text("Pass mark")}: {selectedExam.passMarks}/{selectedExam.maxMarks}</span><span className={"pr-chip " + (selectedExamSubjectClassification?.type === "Optional" ? "pr-chip-amber" : selectedExamSubjectClassification?.type === "Primary / Compulsory" ? "pr-chip-green" : "pr-chip-muted")}>{text(selectedExamSubjectClassification?.type || "Not mapped")}</span></div>
                      <div className="pr-toolbar"><div className="pr-search"><Search size={15}/><input value={marksSearch} onChange={event => setMarksSearch(event.target.value)} placeholder={text("Search student or roll number…")} aria-label={text("Search marks roster")}/></div><span className="pr-field-help">{selectedExamSubjectClassification?.type === "Optional" ? text("Optional subject: leave marks blank for students without a result; blank fields remain unassessed.") : text("Leave marks blank for an unassessed student. Zero is a valid score.")}</span></div>
                      {selectedExamSubjectClassification?.isOptional && <div className="pr-notice" role="note"><span>{text("Only students who have saved this optional-subject choice appear in the marks roster. ")}<button type="button" className="pr-link-button" onClick={() => { const cls = classRecords.find(row => configuredClassLabel(row) === clean(selectedExam.className)); if (cls?.id) setStudentSubjectClassId(String(cls.id)); setStudentSubjectYear(selectedExam.academicYear || academicYearNow()); setActiveTab("studentSubjects"); setLoadError(""); setMessage(""); }}>{text("Manage student choices")}</button></span></div>}
                      {selectedExamSubjectClassification?.isOptional && optionalSubjectRosterLoading && <div className="pr-loading"><span className="pr-spinner"/>{text("Checking saved student subject choices…")}</div>}
                      {selectedExamSubjectClassification?.isOptional && !optionalSubjectRosterLoading && examRoster.length === 0 && <div className="pr-notice">{text("No students have selected this optional subject yet, or student choices could not be loaded. Open Student Optional Subjects and save a choice first.")}</div>}
                      <div className="pr-table-wrap"><table className="pr-table">
                        <thead><tr><th>{text("Student")}</th><th>{text("Roll number")}</th><th>{text("Marks obtained")} / {selectedExam.maxMarks}</th><th>{text("Percentage")}</th><th>{text("Remarks / feedback")}</th></tr></thead>
                        <tbody>
                          {filteredMarksRoster.length ? filteredMarksRoster.map(student => {
                            const draft = marksDraft[String(student.id)] || { marks: "", remarks: "" };
                            const hasMarks = clean(draft.marks) !== "" && Number.isFinite(Number(draft.marks));
                            const validMarks = hasMarks && Number(draft.marks) >= 0 && Number(draft.marks) <= selectedExam.maxMarks;
                            return <tr key={String(student.id)}>
                              <td><strong>{student.name || text("Unnamed student")}</strong><span className="pr-secondary">{student.id}</span></td>
                              <td>{student.rollNumber || "—"}</td>
                              <td><input className="pr-marks-input" type="number" min="0" max={selectedExam.maxMarks} step="0.5" value={draft.marks} onChange={event => updateMark(student.id, "marks", event.target.value)} aria-label={text("Marks for ") + (student.name || student.id)}/>{hasMarks && !validMarks && <span className="pr-secondary" style={{ color: "#bd3f4b" }}>{text("Out of range")}</span>}</td>
                              <td>{hasMarks && validMarks ? (Number(draft.marks) / selectedExam.maxMarks * 100).toFixed(1) + "%" : "—"}{hasMarks && validMarks && Number(draft.marks) >= selectedExam.passMarks ? <span className="pr-secondary" style={{ color: "#16835d" }}>{text("Pass")}</span> : hasMarks && validMarks ? <span className="pr-secondary" style={{ color: "#bd3f4b" }}>{text("Below pass mark")}</span> : null}</td>
                              <td><input className="pr-marks-input" style={{ width: "100%", minWidth: 125 }} value={draft.remarks} onChange={event => updateMark(student.id, "remarks", event.target.value)} maxLength="300" placeholder={text("Optional feedback")}/></td>
                            </tr>;
                          }) : <tr><td colSpan="5" className="pr-table-empty">{text("No active students match this class and academic year. Check Manage Students and the assessment's class/year.")}</td></tr>}
                        </tbody>
                      </table></div>
                      <div className="pr-panel-body">
                        <div className="pr-form-actions">
                          <button type="button" className="pr-button" onClick={() => { const nextDraft = {}; reportData.scores.filter(item => selectedExam && item.examId === selectedExam.id).forEach(item => { nextDraft[item.studentId] = { marks: String(item.marksObtained), remarks: String(item.remarks || "") }; }); setMarksDraft(nextDraft); }}>{text("Discard unsaved changes")}</button>
                          <button type="button" className="pr-button pr-button-primary" onClick={() => void saveMarks()} disabled={saving || !examRoster.length}><Save size={15}/>{saving ? text("Saving…") : text("Save all marks")}</button>
                        </div>
                      </div>
                    </>
                  ) : <div className="pr-panel-body"><p className="pr-field-help">{text("Create an assessment, then choose it from the assessment list. Marks are saved per student and assessment in your school's existing module data.")}</p></div>}
                </section>
              </div>
            </>
          )}

          {activeTab === "subjects" && (
            <section className="pr-panel">
              <div className="pr-panel-header">
                <div>
                  <h3>{text("Class subject configuration")}</h3>
                  <p>{text("Primary / compulsory and optional status is read from each class's saved subject mapping. Configure the type in My Branch → Manage Classes.")}</p>
                </div>
                <a className="pr-button pr-button-primary" href={getNavigationHref({ module: "My Branch", branchPage: "Manage Classes" })}><BookOpen size={15}/>{text("Open Manage Classes")}</a>
              </div>
              <div className="pr-panel-body">
                <div className="pr-notice"><BookOpen size={16}/><span>{text("In Manage Classes, edit a class and use the Optional checkbox for each included subject. Unchecked subjects are Primary / Compulsory. Student choices are stored separately for each student, class, and academic year.")}</span></div>
                <div className="pr-subject-setup-summary">
                  <div><span>{text("Class subject mappings")}</span><strong>{subjectSetupRows.length}</strong></div>
                  <div><span>{text("Primary / compulsory mappings")}</span><strong>{subjectSetupRows.filter(row=>!row.isOptional).length}</strong></div>
                  <div><span>{text("Optional mappings")}</span><strong>{subjectSetupRows.filter(row=>row.isOptional).length}</strong></div>
                </div>
                <div className="pr-table-wrap"><table className="pr-table">
                  <thead><tr><th>{text("Class / Section")}</th><th>{text("Subject")}</th><th>{text("Subject type")}</th><th>{text("Subject options")}</th><th>{text("Assigned teacher")}</th></tr></thead>
                  <tbody>
                    {subjectSetupRows.length ? subjectSetupRows.map((row,index)=><tr key={row.classId+":"+row.subjectId+":"+index}>
                      <td>{row.className||"—"}</td><td><strong>{row.subjectName}</strong></td>
                      <td><span className={"pr-chip "+(row.isOptional?"pr-chip-amber":"pr-chip-green")}>{text(row.isOptional?"Optional":"Primary / Compulsory")}</span></td>
                      <td><div className="pr-inline-meta">{row.extraCurricular&&<span className="pr-chip pr-chip-muted">{text("Extra curricular")}</span>}{row.packageSubject&&<span className="pr-chip pr-chip-muted">{text("Package subject")}</span>}{row.language&&<span className="pr-chip pr-chip-muted">{text("Language")}</span>}{!row.extraCurricular&&!row.packageSubject&&!row.language&&<span className="pr-field-help">—</span>}</div></td>
                      <td>{row.teacherId||"—"}</td>
                    </tr>) : <tr><td colSpan={5} className="pr-table-empty">{text("No class-to-subject mappings are saved yet. Add subjects in Manage Subjects, then include them in each class through Manage Classes.")}</td></tr>}
                  </tbody>
                </table></div>
              </div>
            </section>
          )}

          {activeTab === "studentSubjects" && (
            <StudentOptionalSubjectsPanel
              classRecords={classRecords}
              yearOptions={yearOptions}
              initialClassId={studentSubjectClassId}
              initialAcademicYear={studentSubjectYear || yearOptions[0] || academicYearNow()}
              onContextChange={context => {
                if (context?.classId) setStudentSubjectClassId(String(context.classId));
                if (context?.academicYear) setStudentSubjectYear(String(context.academicYear));
              }}
              onDataLoaded={data => {
                if (!data?.class?.id || !data?.academicYear) return;
                const key = studentOptionalSubjectContextKey(data.class.id, data.academicYear);
                setStudentSubjectSelectionCache(current => ({ ...current, [key]: data }));
              }}
              t={t}
            />
          )}

          {activeTab === "templates" && (
            <section className="pr-panel">
              <div className="pr-panel-header">
                <div>
                  <h3>{text("Database-assigned report template")}</h3>
                  <p>{text("Templates and their terms/settings are loaded from the database. Only Super Admin can change or assign a template.")}</p>
                </div>
                <span className="pr-chip">{reportData.templates.length} {text("assigned template")}</span>
              </div>
              <div className="pr-panel-body">
                {reportData.templates.length ? (
                  <div className="pr-template-grid">
                    {reportData.templates.map(template => (
                      <article className="pr-template-card" key={template.id}>
                        <div className="pr-exam-card-title">
                          <h4>{template.name}</h4>
                          <span className="pr-chip pr-chip-muted">{text("Database template")} · v{template.version}</span>
                        </div>
                        {template.description && <p>{template.description}</p>}
                        <span className="pr-small-label" style={{ marginTop: 13 }}>{text("Terms")}</span>
                        <div className="pr-inline-meta">
                          {template.terms.map(term => <span key={term} className="pr-chip">{term}</span>)}
                          {!template.terms.length && <span className="pr-field-help">{text("No terms are configured in this database template.")}</span>}
                        </div>
                        {template.subterms.length > 0 && (
                          <>
                            <span className="pr-small-label" style={{ marginTop: 13 }}>{text("Subterms / assessment periods")}</span>
                            <div className="pr-inline-meta">{template.subterms.map(term => <span key={term} className="pr-chip pr-chip-muted">{term}</span>)}</div>
                          </>
                        )}
                        <div className="pr-form-actions">
                          <button type="button" className="pr-button pr-button-primary pr-button-small" onClick={() => useTemplate(template)}>
                            <Plus size={13}/>{text("Use template")}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="pr-table-empty">
                    {text("No performance template has been assigned from the database. Ask Super Admin to apply a template to this school-admin account.")}
                  </div>
                )}
              </div>
            </section>
          )}
          {activeTab === "studio" && (
            <section className="pr-panel pr-studio-preview">
              <div className="pr-panel-header">
                <div>
                  <h3>{text("Performance Report Proforma Studio · Lab Preview")}</h3>
                  <p>{text("Explore four template starting points, School ID assignment, term/sub-term marks entry, CSV validation and annual draft report-card generation in an isolated prototype.")}</p>
                </div>
                <a
                  href="/lab/performance-report/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pr-button pr-button-primary"
                >
                  <ExternalLink size={15}/>{text("Open in new tab")}
                </a>
              </div>
              <div className="pr-notice pr-studio-preview-notice" role="note">
                <CheckCircle2 size={17}/>
                <span>{text("Preview only: it uses fictional learners and browser-local storage. It does not read or write real student records, call the ERP API, or change the database. Existing database-backed report tabs remain separate and unchanged.")}</span>
              </div>
              <div className="pr-studio-frame-wrap">
                <iframe
                  className="pr-studio-frame"
                  title={text("Isolated Performance Report Proforma Studio")}
                  src="/lab/performance-report/index.html"
                  loading="lazy"
                />
              </div>
            </section>
          )}

        </>
      )}
    </section>
  );
}
