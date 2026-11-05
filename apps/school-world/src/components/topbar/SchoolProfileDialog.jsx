import React, { useEffect, useState } from "react";
import { Building2, ImagePlus, Trash2, X } from "lucide-react";
import BaseDialog from "../dialogs/BaseDialog.jsx";
import { apiGet, apiPatch } from "../../api.js";
import { useDatabaseSession } from "../../DatabaseSession.jsx";
import { t } from "../../i18n.jsx";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX = 1024 * 1024;

/**
 * The school's own profile: name, contact details and logo. Everything here is per school (tenant)
 * and stored in the database; the logo then shows in the sidebar, on staff ID cards and anywhere
 * else the school is named. Saving is limited to school admins and principals on the server too.
 */
export default function SchoolProfileDialog({ open, onClose, onNotify }) {
  const session = useDatabaseSession();
  const [form, setForm] = useState(null);
  const [logo, setLogo] = useState({ dataUrl: "", fileName: "", changed: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    apiGet("/bootstrap").then((result) => {
      const s = result?.school || {};
      setForm({ name: s.name || "", address: s.address || "", phone: s.phone || "", email: s.email || "" });
      setLogo({ dataUrl: s.config?.logoDataUrl || "", fileName: s.config?.logoFileName || "", changed: false });
    }).catch((e) => setError(e.message || t("The school profile could not be loaded.")));
  }, [open]);

  function pickLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) { setError(t("Choose a PNG, JPEG or WebP image.")); return; }
    if (file.size > LOGO_MAX) { setError(t("The logo must be 1 MB or smaller.")); return; }
    const reader = new FileReader();
    reader.onload = () => { setError(""); setLogo({ dataUrl: String(reader.result || ""), fileName: file.name, changed: true }); };
    reader.onerror = () => setError(t("The image could not be read."));
    reader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const body = { name: form.name.trim(), address: form.address, phone: form.phone, email: form.email };
      if (logo.changed) body.config = { logoDataUrl: logo.dataUrl, logoFileName: logo.fileName };
      await apiPatch("/school/settings", body);
      await session.refresh();
      onNotify?.(t("School profile saved."));
      onClose();
    } catch (e) { setError(e.message || t("The school profile could not be saved.")); }
    finally { setBusy(false); }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <BaseDialog open={open} onClose={onClose} className="tb-dialog" labelledBy="tb-school-title">
      <header className="tb-dialog-head">
        <span className="tb-avatar tb-avatar-lg" aria-hidden="true"><Building2 size={20} /></span>
        <div><h2 id="tb-school-title">{t("School profile")}</h2><p>{t("Name, contact details and logo for this school.")}</p></div>
        <button type="button" className="tb-icon-btn" onClick={onClose} aria-label={t("Close")}><X size={18} /></button>
      </header>
      {error && <p className="tb-alert error" role="alert">{error}</p>}
      {!form ? <p className="tb-hint">{error ? "" : t("Loading…")}</p> : (
        <form className="tb-form" onSubmit={save}>
          <div className="tb-logo-row">
            <div className="tb-logo-preview">{logo.dataUrl ? <img src={logo.dataUrl} alt={t("School logo")} /> : <Building2 size={28} />}</div>
            <div className="tb-logo-actions">
              <strong>{t("School logo")}</strong>
              <small>{t("PNG, JPEG or WebP, up to 1 MB. Square images look best.")}</small>
              <div className="tb-actions left">
                <label className="tb-btn"><ImagePlus size={15} /> {logo.dataUrl ? t("Replace") : t("Upload")}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickLogo} hidden /></label>
                {logo.dataUrl && <button type="button" className="tb-btn" onClick={() => setLogo({ dataUrl: "", fileName: "", changed: true })}><Trash2 size={15} /> {t("Remove")}</button>}
              </div>
            </div>
          </div>
          <label>{t("School name")}<input required minLength={2} maxLength={120} value={form.name} onChange={set("name")} /></label>
          <label>{t("Address")}<input maxLength={300} value={form.address} onChange={set("address")} /></label>
          <div className="tb-two">
            <label>{t("Phone")}<input type="tel" maxLength={30} value={form.phone} onChange={set("phone")} /></label>
            <label>{t("Email")}<input type="email" maxLength={120} value={form.email} onChange={set("email")} /></label>
          </div>
          <div className="tb-actions"><button type="button" className="tb-btn" onClick={onClose}>{t("Cancel")}</button><button type="submit" className="tb-btn primary" disabled={busy}>{busy ? t("Saving…") : t("Save")}</button></div>
        </form>
      )}
    </BaseDialog>
  );
}
