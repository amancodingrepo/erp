import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, LoaderCircle, RefreshCw, Save } from "lucide-react";
import { apiGet, apiPut } from "../../../api.js";
import "./OneWayCommunicationPage.css";

export default function OneWayCommunicationPage({ onBack, notify, t }) {
  const text = typeof t === "function" ? t : value => value;
  const [categories, setCategories] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadSettings({ preserveSuccess = false } = {}) {
    setLoading(true);
    setError("");
    if (!preserveSuccess) setSuccess("");
    setSettingsLoaded(false);
    try {
      const response = await apiGet("/one-way-communication");
      const loaded = Array.isArray(response?.categories) ? response.categories : [];
      setCategories(loaded);
      setBlockedIds(loaded.filter(category => category.parentsBlocked).map(category => String(category.id)));
      setSettingsLoaded(true);
    } catch (requestError) {
      setError(requestError?.message || "Staff categories could not be loaded from the database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadSettings(); }, []);

  function toggleCategory(categoryId, checked) {
    setSuccess("");
    setBlockedIds(current => checked
      ? current.includes(categoryId) ? current : [...current, categoryId]
      : current.filter(id => id !== categoryId));
  }

  async function saveSettings() {
    if (!settingsLoaded || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiPut("/one-way-communication", { blockedCategoryIds: blockedIds });
      await loadSettings({ preserveSuccess: true });
      setSuccess("One Way Communication settings saved to the database.");
      notify?.("One Way Communication settings saved.");
    } catch (requestError) {
      setError(requestError?.message || "Communication settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="one-way-communication-page">
      <button type="button" className="owc-back" onClick={onBack}>
        <ArrowLeft size={15} /> {text("Back to My Branch")}
      </button>

      <header className="owc-heading">
        <div>
          <h2>{text("One way communication for parent")}</h2>
          <p>{text("Only categories saved in Manage Staff Category are shown below.")}</p>
        </div>
        <button type="button" className="owc-refresh" onClick={() => void loadSettings()} disabled={loading || saving}>
          <RefreshCw size={14} /> {text("Reload categories")}
        </button>
      </header>

      {error && <div className="owc-message error" role="alert"><AlertCircle size={17} /><span>{text(error)}</span></div>}
      {success && !error && <div className="owc-message success" role="status"><CheckCircle2 size={17} /><span>{text(success)}</span></div>}

      <section className="owc-panel">
        <header className="owc-panel-heading">
          <div>
            <h3>{text("Parent can't send messages to:")}</h3>
            <p>{text("Select a category to block parent messages to all active staff assigned to that category. Save to apply the rule.")}</p>
          </div>
          <span className="owc-selected-count">{blockedIds.length} {text("blocked")}</span>
        </header>

        {loading ? (
          <div className="owc-loading"><LoaderCircle size={18} className="owc-spin" /> {text("Loading saved staff categories…")}</div>
        ) : categories.length ? (
          <div className="owc-role-list">
            {categories.map(category => (
              <label className="owc-role-option" key={category.id}>
                <input
                  type="checkbox"
                  checked={blockedIds.includes(String(category.id))}
                  onChange={event => toggleCategory(String(category.id), event.target.checked)}
                  disabled={saving || !settingsLoaded}
                />
                <span>{category.name}</span>
                {category.description && <small>{category.description}</small>}
              </label>
            ))}
          </div>
        ) : (
          <div className="owc-no-categories">
            <strong>{text("No saved staff categories")}</strong>
            <p>{text("Create a category first in My Branch → Manage Staff Category. Only database-saved categories can appear here.")}</p>
          </div>
        )}

        <footer className="owc-panel-footer">
          <span>{text("Settings are stored as relational category records. No JSON or JSONB is used for these settings.")}</span>
          <button type="button" className="owc-save" onClick={() => void saveSettings()} disabled={loading || saving || !settingsLoaded || categories.length === 0}>
            {saving ? <LoaderCircle size={16} className="owc-spin" /> : <Save size={16} />}
            {text(saving ? "Saving…" : "Save")}
          </button>
        </footer>
      </section>
    </section>
  );
}
