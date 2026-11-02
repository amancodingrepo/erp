import { useState } from "react";
import { apiPost, apiPut } from "../../api.js";
import {
  MAX_ATTACHMENT_BYTES, MAX_PDF_BYTES, newQuestionnaire, defaultQuestion,
  defaultSection, calculatedMarks, fileToDataUrl
} from "./questionnaireUtils.js";

export function useQuestionnaireEditor({ classes, loadData, setView, setError, announce, saving, setSaving }) {
  const [draft, setDraft] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [symbolQuestionId, setSymbolQuestionId] = useState("");

  function startNew() {
    const next = newQuestionnaire();
    setDraft(next);
    setActiveSectionId(next.sections[0].id);
    setClassDropdownOpen(false);
    setSymbolQuestionId("");
    setView("editor");
    setError("");
  }

  function beginEdit(questionnaire) {
    setDraft(questionnaire);
    setActiveSectionId(questionnaire.sections?.[0]?.id || "");
    setSymbolQuestionId("");
    setClassDropdownOpen(false);
    setView("editor");
  }

  function updateDraft(patch) {
    setDraft(previous => previous ? { ...previous, ...patch } : previous);
  }

  function updateQuestion(sectionId, questionId, patch) {
    setDraft(previous => ({
      ...previous,
      sections: previous.sections.map(section => section.id !== sectionId ? section : {
        ...section,
        questions: section.questions.map(question => question.id !== questionId ? question : { ...question, ...patch })
      })
    }));
  }

  function addQuestion(sectionId) {
    setDraft(previous => ({
      ...previous,
      sections: previous.sections.map(section => section.id === sectionId
        ? { ...section, questions: [...section.questions, defaultQuestion()] }
        : section)
    }));
  }

  function removeQuestion(sectionId, questionId) {
    setDraft(previous => ({
      ...previous,
      sections: previous.sections.map(section => section.id !== sectionId ? section : {
        ...section, questions: section.questions.filter(question => question.id !== questionId)
      })
    }));
  }

  function addSection() {
    const section = defaultSection((draft?.sections?.length || 0) + 1);
    setDraft(previous => ({ ...previous, sections: [...previous.sections, section] }));
    setActiveSectionId(section.id);
  }

  function removeSection(sectionId) {
    if ((draft?.sections || []).length <= 1) return;
    const next = draft.sections.filter(section => section.id !== sectionId);
    setDraft(previous => ({ ...previous, sections: next }));
    if (activeSectionId === sectionId) setActiveSectionId(next[0]?.id || "");
  }

  function toggleClass(classItem, checked) {
    const selected = draft?.classes || [];
    const normalized = {
      id: classItem.id,
      className: classItem.class_name || classItem.className || classItem.name,
      section: classItem.section || ""
    };
    const next = checked
      ? [...selected.filter(item => item.id !== normalized.id), normalized]
      : selected.filter(item => item.id !== normalized.id);
    updateDraft({ classes: next, allClasses: false });
  }

  function toggleAllClasses(checked) {
    updateDraft({
      allClasses: checked,
      classes: checked ? classes.map(item => ({
        id: item.id, className: item.class_name, section: item.section || ""
      })) : []
    });
  }

  function appendSymbol(sectionId, questionId, symbol) {
    const question = draft?.sections?.find(section => section.id === sectionId)?.questions?.find(item => item.id === questionId);
    updateQuestion(sectionId, questionId, { question: (question?.question || "") + symbol });
    setSymbolQuestionId("");
  }

  async function setQuestionAttachment(sectionId, questionId, file) {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError('Attachment "' + file.name + '" must be 1.5 MB or smaller.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      updateQuestion(sectionId, questionId, {
        attachment: { fileName: file.name, mimeType: file.type || "application/octet-stream", dataUrl, size: file.size }
      });
      setError("");
      announce('Attachment "' + file.name + '" added to the question.');
    } catch (err) {
      setError(err.message);
    }
  }

  function validateQuestionnaire(value) {
    if (!value.title?.trim()) return "Enter a title for this questionnaire.";
    if (!value.type) return "Choose a questionnaire type.";
    if (!value.subject?.trim()) return "Enter the subject.";
    if (!value.validFrom || !value.validTo) return "Choose both the Valid From and Valid Till dates.";
    if (new Date(value.validTo).getTime() <= new Date(value.validFrom).getTime()) return "Valid Till must be later than Valid From.";
    if (!(value.sections || []).length) return "Add at least one section.";
    for (const section of value.sections) {
      if (!(section.questions || []).length) return "Add at least one question in " + (section.title || "each section") + ".";
      for (const question of section.questions) {
        if (!question.question?.trim()) return "Enter the question text in " + (section.title || "the selected section") + ".";
        if (!Number.isFinite(Number(question.marks)) || Number(question.marks) < 0) return "Question marks must be zero or more.";
        if (question.attachment?.dataUrl && question.attachment.size > MAX_PDF_BYTES) return "An attachment is too large. Remove it and upload a smaller file.";
      }
    }
    return "";
  }

  async function saveQuestionnaire(event) {
    event?.preventDefault?.();
    if (!draft || saving) return;
    const validation = validateQuestionnaire(draft);
    if (validation) {
      setError(validation);
      return;
    }
    const payload = {
      ...draft,
      title: draft.title.trim(),
      subject: draft.subject.trim(),
      totalMarks: calculatedMarks(draft.sections),
      updatedAt: new Date().toISOString()
    };
    setSaving(true);
    setError("");
    try {
      if (payload.id) await apiPut("/questionnaires/" + payload.id, { questionnaire: payload });
      else await apiPost("/questionnaires", { questionnaire: payload });
      await loadData(false);
      setView("list");
      setDraft(null);
      setClassDropdownOpen(false);
      announce(payload.id ? "Questionnaire updated successfully." : "Questionnaire created successfully.");
    } catch (err) {
      setError("Questionnaire could not be saved: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const activeSection = draft?.sections?.find(section => section.id === activeSectionId) || draft?.sections?.[0] || null;

  return {
    draft, setDraft, activeSectionId, setActiveSectionId, classDropdownOpen,
    setClassDropdownOpen, symbolQuestionId, setSymbolQuestionId, activeSection,
    startNew, beginEdit, updateDraft, updateQuestion, addQuestion, removeQuestion,
    addSection, removeSection, toggleClass, toggleAllClasses, appendSymbol,
    setQuestionAttachment, saveQuestionnaire
  };
}
