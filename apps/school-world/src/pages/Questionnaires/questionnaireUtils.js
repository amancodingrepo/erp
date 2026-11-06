import { appLocale } from "../../school-locale.js";
export const QUESTION_TYPES = ["Survey", "Approval", "Quiz", "Whizzard"];
export const INPUT_TYPES = ["Text", "SingleChoice", "MultipleChoice", "Documents", "Canvas"];
export const SPECIAL_SYMBOLS = ["α", "β", "θ", "π", "√", "∑", "≤", "≥", "±", "×", "÷", "°", "Ω", "→", "≠"];
export const MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export function makeId(prefix = "item") {
  const random = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  return prefix + "-" + random;
}
export function localDateTime(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}
export function getDateAfterDays(days) {
  return localDateTime(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}
export function defaultQuestion() {
  return {
    id: makeId("question"), question: "", marks: 1, topic: "", subTopic: "",
    inputType: "SingleChoice", attachment: null,
    answers: [
      { id: makeId("answer"), text: "", isCorrect: false },
      { id: makeId("answer"), text: "", isCorrect: false }
    ]
  };
}
export function defaultSection(index = 1) {
  return { id: makeId("section"), title: "Section " + index, questions: [defaultQuestion()] };
}
export function newQuestionnaire() {
  const section = defaultSection(1);
  return {
    id: "", title: "", subject: "", type: "Survey",
    validFrom: localDateTime(), validTo: getDateAfterDays(7),
    totalMarks: 0, classes: [], allClasses: false, sections: [section]
  };
}
export function calculatedMarks(sections = []) {
  return sections.reduce((total, section) => total + (section.questions || []).reduce((sum, question) => sum + Math.max(0, Number(question.marks) || 0), 0), 0);
}
export function classDisplay(item) {
  const name = item.class_name || item.className || item.name || "Unnamed class";
  return item.section ? name + " (" + item.section + ")" : name;
}
export function selectedClassLabel(classes, selected, allClasses) {
  if (allClasses) return "All Classes";
  if (!selected.length) return "None selected";
  if (selected.length === 1) {
    const item = classes.find(entry => entry.id === selected[0].id);
    return item ? classDisplay(item) : selected[0].className;
  }
  return selected.length + " classes selected";
}
export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(appLocale(), {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read " + file.name + "."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}
export function downloadDataUrl(dataUrl, filename) {
  if (!dataUrl) return;
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename || "questionnaire-attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
export function extractPdfTextBestEffort(buffer) {
  // Extract readable literal text when it is present. The original PDF is kept as an attachment.
  const raw = new TextDecoder("latin1").decode(buffer);
  const chunks = [];
  const decodeLiteral = value => value
    .replace(/\\([nrtbf()\\])/g, (_, ch) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" }[ch] ?? ch))
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
  const collect = source => {
    const textOperators = /\(((?:\\.|[^\\)])*)\)\s*Tj|\(((?:\\.|[^\\)])*)\)\s*['"]|\[((?:.|\n|\r)*?)\]\s*TJ/g;
    let match;
    while ((match = textOperators.exec(source))) {
      if (match[1] !== undefined) chunks.push(decodeLiteral(match[1]));
      else if (match[2] !== undefined) chunks.push(decodeLiteral(match[2]));
      else {
        const stringPattern = /\(((?:\\.|[^\\)])*)\)/g;
        let item;
        while ((item = stringPattern.exec(match[3]))) chunks.push(decodeLiteral(item[1]));
      }
    }
  };
  collect(raw);
  const result = chunks.join(" ").replace(/\s+/g, " ").trim();
  return result.length > 30 ? result : "";
}
export async function importPdfAsQuestionnaire(file) {
  const buffer = await file.arrayBuffer();
  const extractedText = extractPdfTextBestEffort(buffer);
  const dataUrl = await fileToDataUrl(file);
  const title = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || "Imported PDF Questionnaire";
  const question = defaultQuestion();
  question.question = extractedText
    ? "Imported PDF content (review and split into individual questions):\n" + extractedText.slice(0, 10000)
    : "Questions are contained in the attached PDF \"" + file.name + "\". Review the document and add individual questions here.";
  question.inputType = "Documents";
  question.marks = 0;
  question.attachment = { fileName: file.name, mimeType: file.type || "application/pdf", dataUrl: dataUrl, size: file.size };
  question.answers = [];
  const section = defaultSection(1);
  section.questions = [question];
  return {
    ...newQuestionnaire(), title: title, type: "Quiz", subject: "",
    validFrom: localDateTime(), validTo: getDateAfterDays(7), sections: [section]
  };
}
