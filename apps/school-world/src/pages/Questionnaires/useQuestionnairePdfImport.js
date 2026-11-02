import { useState } from "react";
import { apiPost } from "../../api.js";
import { MAX_PDF_BYTES, importPdfAsQuestionnaire } from "./questionnaireUtils.js";

export function useQuestionnairePdfImport({ loadData, setError, announce }) {
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [importingPdf, setImportingPdf] = useState(false);

  async function createFromPdf() {
    if (!pdfFiles.length || importingPdf) {
      setError("Choose at least one PDF file to import.");
      return;
    }
    const invalid = pdfFiles.find(file => !/\\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf"));
    if (invalid) {
      setError('"' + invalid.name + '" is not a PDF file.');
      return;
    }
    const tooLarge = pdfFiles.find(file => file.size > MAX_PDF_BYTES);
    if (tooLarge) {
      setError('"' + tooLarge.name + '" exceeds the 5 MB limit.');
      return;
    }

    setImportingPdf(true);
    setError("");
    let created = 0;
    try {
      for (const file of pdfFiles) {
        const payload = await importPdfAsQuestionnaire(file);
        await apiPost("/questionnaires", { questionnaire: payload });
        created += 1;
      }
      setPdfFiles([]);
      setShowPdfImport(false);
      await loadData(false);
      announce(String(created) + " questionnaire" + (created === 1 ? "" : "s") + " imported from PDF. The original PDF is attached; review the imported content before assigning it to students.");
    } catch (err) {
      setError("PDF import stopped after " + created + " file(s): " + err.message);
    } finally {
      setImportingPdf(false);
    }
  }

  function togglePdfImport() {
    setShowPdfImport(value => !value);
    setPdfFiles([]);
    setError("");
  }

  return { showPdfImport, setShowPdfImport, pdfFiles, setPdfFiles, importingPdf, createFromPdf, togglePdfImport };
}
