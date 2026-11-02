import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";

const EMPTY_NOTES = [];
const buttonStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1px solid #cbd8e6", borderRadius: 8, padding: "7px 10px", background: "#fff", color: "#254969", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const noteStyle = { width: "100%", minHeight: 62, resize: "vertical", border: "1px solid #ccd8e5", borderRadius: 8, padding: 9, font: "inherit", fontSize: 13, boxSizing: "border-box" };

export default function TemplateReceiptNotesEditor({ admin, saving, onSave }) {
  const templateId = admin.feeReceipt?.templateId || "";
  const savedNotes = admin.feeReceipt?.receiptNotes || EMPTY_NOTES;
  const available = admin.feeReceipt?.receiptNotesAvailable !== false;
  const [notes, setNotes] = useState(() => savedNotes.map(note => ({ text: note.noteText || "" })));

  useEffect(() => {
    setNotes(savedNotes.map(note => ({ text: note.noteText || "" })));
  }, [admin.id, templateId, savedNotes]);

  const updateNote = (index, text) => setNotes(previous => previous.map((note, i) => i === index ? { ...note, text } : note));
  const moveNote = (index, offset) => setNotes(previous => {
    const next = [...previous];
    const target = index + offset;
    if (target < 0 || target >= next.length) return previous;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const removeNote = index => setNotes(previous => previous.filter((_, i) => i !== index));

  return <section style={{ marginTop: 13, padding: 14, border: "1px solid #dce6f0", borderRadius: 12, background: "#f8fbfe" }} aria-label={"Receipt notes for " + admin.schoolName}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div>
        <strong style={{ display: "block", color: "#1b3656", fontSize: 14 }}>Fee receipt notes</strong>
        <span style={{ display: "block", color: "#65788d", fontSize: 12, marginTop: 3 }}>School-specific numbered notes. Add, edit, remove, or reorder them.</span>
      </div>
      <button type="button" style={buttonStyle} disabled={!templateId || !available || saving || notes.length >= 100} onClick={() => setNotes(previous => [...previous, { text: "" }])}><Plus size={14} /> Add note</button>
    </div>
    {!templateId ? <p role="status" style={{ color: "#7b5b18", fontSize: 12 }}>Apply a fee receipt template to this school before configuring its notes.</p> : null}
    {templateId && !available ? <p role="status" style={{ color: "#8a5115", fontSize: 12 }}>Migration 007 is not applied to the connected database yet. You can review the editor, but saving is disabled until the migration is approved and applied.</p> : null}
    {notes.length ? <ol style={{ margin: "14px 0", paddingLeft: 23 }}>
      {notes.map((note, index) => <li key={index} style={{ paddingLeft: 4, marginBottom: 10 }}>
        <textarea aria-label={"Receipt note " + (index + 1)} style={noteStyle} maxLength={500} value={note.text} disabled={!templateId || !available || saving} placeholder="Enter a note specific to this school's fee receipt." onChange={event => updateNote(index, event.target.value)} />
        <div style={{ display: "flex", gap: 6, marginTop: 5, justifyContent: "flex-end" }}>
          <button type="button" aria-label={"Move note " + (index + 1) + " up"} title="Move up" style={buttonStyle} disabled={index === 0 || saving || !available} onClick={() => moveNote(index, -1)}><ArrowUp size={13} /></button>
          <button type="button" aria-label={"Move note " + (index + 1) + " down"} title="Move down" style={buttonStyle} disabled={index === notes.length - 1 || saving || !available} onClick={() => moveNote(index, 1)}><ArrowDown size={13} /></button>
          <button type="button" aria-label={"Remove note " + (index + 1)} title="Remove note" style={buttonStyle} disabled={saving || !available} onClick={() => removeNote(index)}><Trash2 size={13} /></button>
        </div>
      </li>)}
    </ol> : <p style={{ color: "#65788d", fontSize: 12 }}>No receipt notes saved. Add the first note for this school.</p>}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ color: "#65788d", fontSize: 11 }}>{notes.length} note(s) · up to 500 characters each</span>
      <button type="button" style={{ ...buttonStyle, background: "#155eac", borderColor: "#155eac", color: "#fff" }} disabled={!templateId || !available || saving || notes.some(note => !note.text.trim())} onClick={() => void onSave(admin, notes.map(note => ({ noteText: note.text.trim() })))}><Save size={14} /> {saving ? "Saving notes…" : "Save receipt notes"}</button>
    </div>
  </section>;
}
