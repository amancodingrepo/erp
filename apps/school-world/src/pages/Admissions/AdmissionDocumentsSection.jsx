import React from "react";
import { FileText, X } from "lucide-react";
import { t } from "../../i18n.jsx";

export default function AdmissionDocumentsSection({ context }) {
  const { documents, setDocuments } = context;
  return (
    <section className="admission-card required-docs" id="admission-documents"><h2>{t("Required documents")}</h2><p className="admission-help">{t("Selected file names are saved with the enquiry; the actual document files are not uploaded yet.")}</p><label className="legacy-primary">{t("Add documents ")}<input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={e=>setDocuments(prev=>[...prev,...Array.from(e.target.files||[]).map(f=>f.name)])}/></label><small>{t("Supported File Formats: jpg, jpeg, png, pdf")}</small>{documents.length>0&&<ul>{documents.map((doc,i)=><li key={`${doc}-${i}`}><FileText size={14}/>{doc}<button onClick={()=>setDocuments(prev=>prev.filter((_,ix)=>ix!==i))}><X size={14}/></button></li>)}</ul>}</section>
  );
}
