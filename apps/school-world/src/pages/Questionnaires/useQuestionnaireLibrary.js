import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch } from "../../api.js";

export function useQuestionnaireLibrary({ setError, setView, saving, setSaving, announce }) {
  const [classes, setClasses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsSearch, setSubmissionsSearch] = useState("");

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const results = await Promise.all([
        apiGet("/questionnaires/classes"),
        apiGet("/questionnaires")
      ]);
      setClasses(Array.isArray(results[0].classes) ? results[0].classes : []);
      setItems(Array.isArray(results[1].questionnaires) ? results[1].questionnaires : []);
    } catch (err) {
      setError("Questionnaires could not be loaded: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(item => [
      item.title, item.type, item.subject, item.validFrom, item.validTo,
      ...(item.classes || []).map(entry => entry.className)
    ].some(value => String(value || "").toLowerCase().includes(query)));
  }, [items, search]);

  const filteredSubmissions = useMemo(() => {
    const query = submissionsSearch.trim().toLowerCase();
    if (!query) return submissions;
    return submissions.filter(item => [item.name, item.className, item.marks, item.date]
      .some(value => String(value ?? "").toLowerCase().includes(query)));
  }, [submissions, submissionsSearch]);

  async function loadQuestionnaire(questionnaireId, errorPrefix) {
    setLoading(true);
    setError("");
    try {
      const result = await apiGet("/questionnaires/" + questionnaireId);
      return result.questionnaire;
    } catch (err) {
      setError(errorPrefix + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(item) {
    const questionnaire = await loadQuestionnaire(item.id, "Questionnaire details could not be loaded: ");
    if (!questionnaire) return;
    setDetail(questionnaire);
    setView("detail");
  }

  async function openAssignments(item) {
    const questionnaire = await loadQuestionnaire(item.id, "Class assignments could not be loaded: ");
    if (!questionnaire) return;
    setDetail(questionnaire);
    setView("assign");
  }

  async function openSubmissions(item) {
    setLoading(true);
    setError("");
    setSubmissionsSearch("");
    try {
      const results = await Promise.all([
        apiGet("/questionnaires/" + item.id),
        apiGet("/questionnaires/" + item.id + "/submissions")
      ]);
      setDetail(results[0].questionnaire);
      setSubmissions(Array.isArray(results[1].submissions) ? results[1].submissions : []);
      setView("submissions");
    } catch (err) {
      setError("Submissions could not be loaded: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveAssignments() {
    if (!detail || saving) return;
    setSaving(true);
    setError("");
    const payload = {
      classes: detail.allClasses
        ? classes.map(item => ({ id: item.id, className: item.class_name, section: item.section || "" }))
        : (detail.classes || []),
      allClasses: Boolean(detail.allClasses)
    };
    try {
      const result = await apiPatch("/questionnaires/" + detail.id + "/classes", payload);
      setDetail(result.questionnaire);
      await loadData(false);
      announce("Class assignments saved successfully.");
      setView("list");
    } catch (err) {
      setError("Class assignments could not be saved: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateDetailClass(classItem, checked) {
    const existing = detail?.classes || [];
    const entry = { id: classItem.id, className: classItem.class_name, section: classItem.section || "" };
    const next = checked
      ? [...existing.filter(item => item.id !== entry.id), entry]
      : existing.filter(item => item.id !== entry.id);
    setDetail(previous => ({ ...previous, classes: next, allClasses: false }));
  }

  function setDetailAllClasses(checked) {
    setDetail(previous => ({
      ...previous,
      allClasses: checked,
      classes: checked ? classes.map(item => ({
        id: item.id, className: item.class_name, section: item.section || ""
      })) : []
    }));
  }

  return {
    classes, items, loading, search, setSearch, detail, setDetail,
    submissions, submissionsSearch, setSubmissionsSearch,
    filteredItems, filteredSubmissions, loadData, loadQuestionnaire,
    openDetail, openAssignments, openSubmissions, saveAssignments,
    updateDetailClass, setDetailAllClasses
  };
}
