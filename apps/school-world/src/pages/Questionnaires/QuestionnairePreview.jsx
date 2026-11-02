import React from "react";
import { ArrowLeft, Pencil, Paperclip, Download } from "lucide-react";
import { classDisplay, formatDate, downloadDataUrl } from "./questionnaireUtils.js";

export default function QuestionnairePreview(props) {
  const { detail, setView, openEditor } = props;
  return (
    <section className="questionnaires-detail-view">
      <div className="questionnaires-subpage-toolbar"><button type="button" className="questionnaires-secondary" onClick={() => setView("list")}><ArrowLeft size={15} /> Back to List</button><button type="button" className="questionnaires-primary" onClick={() => openEditor(detail)}><Pencil size={15} /> Edit Questionnaire</button></div>
      <header className="questionnaires-detail-header"><div><span className="questionnaires-eyebrow">{detail.type || "QUESTIONNAIRE"}</span><h2>{detail.title}</h2><p>{detail.subject || "No subject specified"}</p></div><div className="questionnaires-detail-total"><strong>{Number(detail.totalMarks || 0).toFixed(2)}</strong><span>Total Marks</span></div></header>
      <div className="questionnaires-detail-meta"><div><span>Valid From</span><strong>{formatDate(detail.validFrom)}</strong></div><div><span>Valid Till</span><strong>{formatDate(detail.validTo)}</strong></div><div><span>Assigned Classes</span><strong>{detail.allClasses ? "All Classes" : (detail.classes || []).map(item => classDisplay(item)).join(", ") || "Not assigned"}</strong></div></div>
      {(detail.sections || []).map((section, sectionIndex) => <section className="questionnaires-detail-section" key={section.id}><header><span>SECTION {sectionIndex + 1}</span><h3>{section.title}</h3></header>
        {(section.questions || []).map((question, qIndex) => <article className="questionnaires-detail-question" key={question.id}><div className="questionnaires-detail-qtitle"><strong>{qIndex + 1}. {question.question}</strong><span>{Number(question.marks || 0)} marks</span></div><div className="questionnaires-detail-tags">{question.topic && <span>Topic: {question.topic}</span>}{question.subTopic && <span>Sub Topic: {question.subTopic}</span>}<span>Input Type: {question.inputType}</span></div>
          {!!question.answers?.length && <ul>{question.answers.filter(answer => answer.text?.trim()).map(answer => <li key={answer.id}>{answer.text}{answer.isCorrect && <span className="questionnaires-correct-badge">Correct answer</span>}</li>)}</ul>}
          {question.attachment?.fileName && <div className="questionnaires-detail-attachment"><Paperclip size={15} /><span>{question.attachment.fileName}</span>{question.attachment.dataUrl ? <button type="button" onClick={() => downloadDataUrl(question.attachment.dataUrl, question.attachment.fileName)}><Download size={14} /> Download</button> : <small>Attachment stored</small>}</div>}
        </article>)}
      </section>)}
    </section>
  );
}
