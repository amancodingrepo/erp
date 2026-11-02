import React, { useState } from "react";
import { CheckCircle2, AlertCircle, LoaderCircle, X } from "lucide-react";
import QuestionnaireLibrary from "./QuestionnaireLibrary.jsx";
import QuestionnaireEditor from "./QuestionnaireEditor.jsx";
import QuestionnairePreview from "./QuestionnairePreview.jsx";
import QuestionnaireClassAssignments from "./QuestionnaireClassAssignments.jsx";
import QuestionnaireSubmissions from "./QuestionnaireSubmissions.jsx";
import { useQuestionnaireLibrary } from "./useQuestionnaireLibrary.js";
import { useQuestionnaireEditor } from "./useQuestionnaireEditor.js";
import { useQuestionnairePdfImport } from "./useQuestionnairePdfImport.js";

/**
 * Top-level coordinator for the Questionnaires feature.
 * Screen markup is kept in the named components; workflow logic is grouped into hooks.
 */
export default function QuestionnairesModulePage({ notify, t = value => value }) {
  const [view, setView] = useState("list");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function announce(message) {
    setNotice(message);
    setError("");
    notify?.(message);
  }

  const library = useQuestionnaireLibrary({
    setError,
    setView,
    saving,
    setSaving,
    announce
  });
  const editor = useQuestionnaireEditor({
    classes: library.classes,
    loadData: library.loadData,
    setView,
    setError,
    announce,
    saving,
    setSaving
  });
  const pdfImport = useQuestionnairePdfImport({
    loadData: library.loadData,
    setError,
    announce
  });

  function startNewQuestionnaire() {
    setNotice("");
    editor.startNew();
  }

  async function openEditor(item) {
    const questionnaire = await library.loadQuestionnaire(item.id, "Questionnaire could not be opened: ");
    if (!questionnaire) return;
    setNotice("");
    editor.beginEdit(questionnaire);
  }

  if (library.loading) {
    return <section className="questionnaires-module">
      <div className="questionnaires-state">
        <LoaderCircle size={24} className="questionnaires-spin" />
        <span>Loading questionnaires…</span>
      </div>
    </section>;
  }

  return <section className="questionnaires-module">
    {(error || notice) && <div className={"questionnaires-notice " + (error ? "error" : "success")} role="status">
      {error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
      <span>{error || notice}</span>
      <button type="button" aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }}>
        <X size={15} />
      </button>
    </div>}

    {view === "list" && <QuestionnaireLibrary
      startNew={startNewQuestionnaire}
      showPdfImport={pdfImport.showPdfImport}
      setShowPdfImport={pdfImport.setShowPdfImport}
      pdfFiles={pdfImport.pdfFiles}
      setPdfFiles={pdfImport.setPdfFiles}
      setError={setError}
      importingPdf={pdfImport.importingPdf}
      createFromPdf={pdfImport.createFromPdf}
      search={library.search}
      setSearch={library.setSearch}
      filteredItems={library.filteredItems}
      items={library.items}
      loadData={library.loadData}
      openEditor={openEditor}
      openDetail={library.openDetail}
      openAssignments={library.openAssignments}
      openSubmissions={library.openSubmissions}
    />}

    {view === "editor" && editor.draft && <QuestionnaireEditor
      draft={editor.draft}
      saveQuestionnaire={editor.saveQuestionnaire}
      saving={saving}
      setView={setView}
      setDraft={editor.setDraft}
      setClassDropdownOpen={editor.setClassDropdownOpen}
      classDropdownOpen={editor.classDropdownOpen}
      classes={library.classes}
      toggleAllClasses={editor.toggleAllClasses}
      toggleClass={editor.toggleClass}
      updateDraft={editor.updateDraft}
      activeSectionId={editor.activeSectionId}
      setActiveSectionId={editor.setActiveSectionId}
      setSymbolQuestionId={editor.setSymbolQuestionId}
      symbolQuestionId={editor.symbolQuestionId}
      removeSection={editor.removeSection}
      addSection={editor.addSection}
      activeSection={editor.activeSection}
      setQuestionAttachment={editor.setQuestionAttachment}
      updateQuestion={editor.updateQuestion}
      addQuestion={editor.addQuestion}
      appendSymbol={editor.appendSymbol}
      removeQuestion={editor.removeQuestion}
    />}

    {view === "detail" && library.detail && <QuestionnairePreview
      detail={library.detail}
      setView={setView}
      openEditor={openEditor}
    />}

    {view === "assign" && library.detail && <QuestionnaireClassAssignments
      detail={library.detail}
      setView={setView}
      saving={saving}
      saveAssignments={library.saveAssignments}
      classes={library.classes}
      setDetailAllClasses={library.setDetailAllClasses}
      updateDetailClass={library.updateDetailClass}
    />}

    {view === "submissions" && library.detail && <QuestionnaireSubmissions
      detail={library.detail}
      setView={setView}
      submissionsSearch={library.submissionsSearch}
      setSubmissionsSearch={library.setSubmissionsSearch}
      filteredSubmissions={library.filteredSubmissions}
      submissions={library.submissions}
    />}
  </section>;
}
