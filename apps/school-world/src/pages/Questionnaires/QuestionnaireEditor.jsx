import React from "react";
import { Plus, ArrowLeft, Save, X, Paperclip, FileText, Trash2, LoaderCircle } from "lucide-react";
import { QUESTION_TYPES, INPUT_TYPES, SPECIAL_SYMBOLS, makeId, calculatedMarks } from "./questionnaireUtils.js";
import ClassMultiSelect from "./ClassMultiSelect.jsx";

function SectionTab({ section, active, onClick, onRemove, canRemove }) {
  return <div className={"questionnaires-section-tab" + (active ? " active" : "")}>
    <button type="button" onClick={onClick}>{section.title || "Untitled section"}</button>
    {canRemove && <button type="button" className="questionnaires-section-remove" onClick={onRemove} aria-label={"Remove " + section.title} title="Remove section"><X size={12} /></button>}
  </div>;
}

export default function QuestionnaireEditor(props) {
  const { draft, saveQuestionnaire, saving, setView, setDraft, setClassDropdownOpen, classDropdownOpen, classes, toggleAllClasses, toggleClass, updateDraft, activeSectionId, setActiveSectionId, setSymbolQuestionId, symbolQuestionId, removeSection, addSection, activeSection, setQuestionAttachment, updateQuestion, addQuestion, appendSymbol, removeQuestion } = props;
  return (
    <form className="questionnaires-editor" onSubmit={saveQuestionnaire}>
      <div className="questionnaires-editor-toolbar">
        <button type="button" className="questionnaires-secondary" onClick={() => { setView("list"); setDraft(null); setClassDropdownOpen(false); }}><ArrowLeft size={15} /> Back to List</button>
        <div><span className="questionnaires-status-dot" /> {draft.id ? "Editing questionnaire" : "New questionnaire"}</div>
        <button type="submit" className="questionnaires-primary" disabled={saving}>{saving ? <LoaderCircle size={15} className="questionnaires-spin" /> : <Save size={15} />}{saving ? " Saving…" : " Save Questionnaire"}</button>
      </div>
      <section className="questionnaires-meta-card"><div className="questionnaires-meta-grid">
        <div className="questionnaires-field questionnaires-class-field">
          <span>Class</span>
          <ClassMultiSelect
            classes={classes}
            selectedClasses={draft.classes || []}
            allClasses={Boolean(draft.allClasses)}
            isOpen={classDropdownOpen}
            setIsOpen={setClassDropdownOpen}
            onToggleClass={toggleClass}
            onToggleAllClasses={toggleAllClasses}
          />
        </div>
        <label className="questionnaires-field"><span>Type</span><select required value={draft.type || "Survey"} onChange={event => updateDraft({ type: event.target.value })}>{QUESTION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="questionnaires-field"><span>Title</span><input required maxLength={220} value={draft.title || ""} onChange={event => updateDraft({ title: event.target.value })} placeholder="Enter questionnaire title" /></label>
        <label className="questionnaires-field"><span>Subject</span><input required maxLength={160} value={draft.subject || ""} onChange={event => updateDraft({ subject: event.target.value })} placeholder="Enter subject" /></label>
        <label className="questionnaires-field"><span>Valid From</span><input required type="datetime-local" value={draft.validFrom || ""} onChange={event => updateDraft({ validFrom: event.target.value })} /></label>
        <label className="questionnaires-field"><span>Valid Till</span><input required type="datetime-local" value={draft.validTo || ""} min={draft.validFrom || undefined} onChange={event => updateDraft({ validTo: event.target.value })} /></label>
        <label className="questionnaires-field"><span>Total Marks</span><input readOnly value={calculatedMarks(draft.sections).toFixed(2)} /></label>
      </div></section>

      <div className="questionnaires-section-tabs">
        {(draft.sections || []).map(section => <SectionTab key={section.id} section={section} active={activeSectionId === section.id} onClick={() => { setActiveSectionId(section.id); setSymbolQuestionId(""); }} onRemove={() => removeSection(section.id)} canRemove={(draft.sections || []).length > 1} />)}
        <button type="button" className="questionnaires-add-section" onClick={addSection}><Plus size={14} /> New Section</button>
      </div>
      {activeSection && <section className="questionnaires-section-editor">
        <div className="questionnaires-section-title"><div><span>SECTION {(draft.sections || []).findIndex(section => section.id === activeSection.id) + 1}</span><input aria-label="Section name" value={activeSection.title || ""} onChange={event => setDraft(previous => ({ ...previous, sections: previous.sections.map(section => section.id === activeSection.id ? { ...section, title: event.target.value } : section) }))} /></div><button type="button" className="questionnaires-link-action" onClick={() => addQuestion(activeSection.id)}><Plus size={15} /> Add Question</button></div>
        {(activeSection.questions || []).map((question, index) => <article className="questionnaires-question-card" key={question.id}>
          <div className="questionnaires-question-header"><div><span>QUESTION {index + 1}</span><small>{Number(question.marks || 0)} mark{Number(question.marks || 0) === 1 ? "" : "s"}</small></div><button type="button" aria-label="Remove question" title="Remove question" className="questionnaires-danger-icon" onClick={() => removeQuestion(activeSection.id, question.id)} disabled={activeSection.questions.length <= 1}><Trash2 size={16} /></button></div>
          <div className="questionnaires-question-grid">
            <div className="questionnaires-field questionnaires-wide"><span>Question</span><textarea rows={2} value={question.question || ""} onChange={event => updateQuestion(activeSection.id, question.id, { question: event.target.value })} placeholder="Enter question text" />
              <span className="questionnaires-question-tools"><button type="button" onClick={() => setSymbolQuestionId(value => value === question.id ? "" : question.id)} title="Insert a mathematical or special symbol">Ω Symbols</button>{symbolQuestionId === question.id && <span className="questionnaires-symbol-menu">{SPECIAL_SYMBOLS.map(symbol => <button type="button" key={symbol} onClick={() => appendSymbol(activeSection.id, question.id, symbol)}>{symbol}</button>)}</span>}</span>
            </div>
            <label className="questionnaires-field"><span>Marks</span><input type="number" min="0" max="1000" step="0.25" value={question.marks ?? 0} onChange={event => updateQuestion(activeSection.id, question.id, { marks: event.target.value })} /></label>
            <label className="questionnaires-field"><span>Topic</span><input value={question.topic || ""} onChange={event => updateQuestion(activeSection.id, question.id, { topic: event.target.value })} placeholder="Topic" /></label>
            <label className="questionnaires-field"><span>Sub Topic</span><input value={question.subTopic || ""} onChange={event => updateQuestion(activeSection.id, question.id, { subTopic: event.target.value })} placeholder="Sub Topic" /></label>
            <label className="questionnaires-field"><span>Input Type</span><select value={question.inputType || "SingleChoice"} onChange={event => updateQuestion(activeSection.id, question.id, { inputType: event.target.value, answers: question.answers || [] })}>{INPUT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
            <div className="questionnaires-field questionnaires-attachment"><span>Attachment</span><label className="questionnaires-attachment-pick"><Paperclip size={15} /> Upload Attachment<input type="file" onChange={event => { setQuestionAttachment(activeSection.id, question.id, event.target.files?.[0]); event.target.value = ""; }} /></label>{question.attachment?.fileName && <div className="questionnaires-attachment-file"><FileText size={14} /><span>{question.attachment.fileName}</span><button type="button" aria-label="Remove attachment" onClick={() => updateQuestion(activeSection.id, question.id, { attachment: null })}><X size={13} /></button></div>}</div>
          </div>
          <div className="questionnaires-answers">
            <div className="questionnaires-answers-heading"><div><strong>Answers / Options</strong><small>Mark the correct option for quiz-style questions.</small></div><button type="button" className="questionnaires-link-action" onClick={() => updateQuestion(activeSection.id, question.id, { answers: [...(question.answers || []), { id: makeId("answer"), text: "", isCorrect: false }] })}><Plus size={14} /> Add Answer</button></div>
            {(question.answers || []).map((answer, answerIndex) => <div className="questionnaires-answer-row" key={answer.id}>
              <label><span>Option {answerIndex + 1}</span><input value={answer.text || ""} onChange={event => updateQuestion(activeSection.id, question.id, { answers: question.answers.map(item => item.id !== answer.id ? item : { ...item, text: event.target.value }) })} placeholder={"Enter option " + (answerIndex + 1)} /></label>
              <label className="questionnaires-correct-option"><input type="checkbox" checked={Boolean(answer.isCorrect)} onChange={event => {
                const checked = event.target.checked;
                const single = question.inputType === "SingleChoice";
                updateQuestion(activeSection.id, question.id, { answers: question.answers.map(item => item.id === answer.id ? { ...item, isCorrect: checked } : (single && checked ? { ...item, isCorrect: false } : item)) });
              }} /><span>Is Correct Option</span></label>
              <button type="button" className="questionnaires-danger-icon" aria-label={"Remove option " + (answerIndex + 1)} title="Remove option" onClick={() => updateQuestion(activeSection.id, question.id, { answers: question.answers.filter(item => item.id !== answer.id) })} disabled={question.answers.length <= 1}><X size={16} /></button>
            </div>)}
            {!question.answers?.length && <p className="questionnaires-answer-note">This question type does not require answer options. Use Add Answer to add options if needed.</p>}
          </div>
        </article>)}
        <button type="button" className="questionnaires-add-question-bottom" onClick={() => addQuestion(activeSection.id)}><Plus size={15} /> Add Question to {activeSection.title || "Section"}</button>
      </section>}
    </form>
  );
}
