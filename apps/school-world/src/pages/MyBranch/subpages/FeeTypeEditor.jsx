import React from "react";
import { Check } from "lucide-react";

export default function FeeTypeEditor({ context }) {
  const { text, draft, setDraft, updateTax, saveFeeType, saving, loadError, setPage } = context;
  return (<form className="fees-setup-form-card" onSubmit={saveFeeType}>
      <div className="fees-setup-form-grid">
        <label className="fees-setup-wide-field">{text("Name")}<input autoFocus maxLength={100} required value={draft.name} onChange={event => setDraft(previous => ({ ...previous, name: event.target.value }))} placeholder={text("e.g. Tuition Fee, Admission Fee")} /></label>
        <label className="fees-setup-check-row"><input type="checkbox" checked={draft.refundable} onChange={event => setDraft(previous => ({ ...previous, refundable: event.target.checked }))}/><span><strong>{text("Is Refundable")}</strong><small>{text("Enable when this fee can be refunded.")}</small></span></label>
        <label className="fees-setup-check-row"><input type="checkbox" checked={draft.visible} onChange={event => setDraft(previous => ({ ...previous, visible: event.target.checked }))}/><span><strong>{text("Is Visible")}</strong><small>{text("Visible fee types are available in fee templates.")}</small></span></label>
      </div>
      <div className="fees-setup-divider"/>
      <div className="fees-setup-section-heading"><h3>{text("GST Configuration")}</h3><p>{text("Choose tax components applicable to this fee type.")}</p></div>
      <div className="fees-setup-tax-list">
        <label className="fees-setup-check-row"><input type="checkbox" checked={draft.taxes.cgst} onChange={event => updateTax("cgst", event.target.checked)}/><span><strong>{text("CGST Applicable")}</strong><small>{text("Applies 9% Central GST to this fee type.")}</small></span><em>9%</em></label>
        <label className="fees-setup-check-row"><input type="checkbox" checked={draft.taxes.sgst} onChange={event => updateTax("sgst", event.target.checked)}/><span><strong>{text("SGST Applicable")}</strong><small>{text("Applies 9% State GST to this fee type.")}</small></span><em>9%</em></label>
        <label className="fees-setup-check-row"><input type="checkbox" checked={draft.taxes.igst} onChange={event => updateTax("igst", event.target.checked)}/><span><strong>{text("IGST Applicable")}</strong><small>{text("Applies 18% Integrated GST to this fee type.")}</small></span><em>18%</em></label>
      </div>
      <div className="fees-setup-form-actions"><button className="fees-setup-primary" type="submit" disabled={saving || Boolean(loadError)}>{saving ? text("Saving…") : <><Check size={15}/>{text("Submit")}</>}</button><button className="fees-setup-secondary" type="button" onClick={() => setPage("list")} disabled={saving}>{text("Cancel")}</button></div>
    </form>);
}
