import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import FeeTemplateInstallmentDialog from "../src/pages/Templates/FeeStructure/FeeTemplateInstallmentDialog.jsx";
import { blankInstallment, blankLine, money, subtotalForLine, taxLabels } from "../src/pages/Templates/FeeStructure/feeTemplateUtils.js";
import "../src/styles.css";

function FeeInstallmentDialogHarness() {
  const [installmentModal, setInstallmentModal] = useState(false);
  const [installmentDraft, setInstallmentDraft] = useState(() => {
    const draft = blankInstallment();
    draft.fees = [{
      ...blankLine(),
      feeTypeId: "tuition",
      feeTypeName: "Tuition",
      amount: "100",
    }];
    return draft;
  });
  const [saveCount, setSaveCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState("Not submitted");

  function updateInstallmentLine(lineId, key, value) {
    setInstallmentDraft(previous => ({
      ...previous,
      fees: previous.fees.map(line => line.id === lineId ? { ...line, [key]: value } : line),
    }));
  }

  function saveInstallment(event) {
    event.preventDefault();
    setSaveCount(count => count + 1);
    setSaveStatus("Saved");
    setInstallmentModal(false);
  }

  const context = {
    installmentModal,
    setInstallmentModal,
    text: value => value,
    installmentDraft,
    setInstallmentDraft,
    saveInstallment,
    installmentOptions: ["First", "Second"],
    blankLine,
    updateInstallmentLine,
    feeTypes: [{ id: "tuition", name: "Tuition", taxes: { cgst: false, sgst: false, igst: false } }],
    taxLabels,
    money,
    subtotalForLine,
  };

  return (
    <div className="legacy-app my-branch-page">
      <section className="my-branch-feature-view fees-setup-page fees-template-page" style={{ minHeight: "100vh", padding: 24 }}>
        <main>
          <button type="button" onClick={() => setInstallmentModal(true)}>Open Dialog</button>
          <button type="button" onClick={() => { setInstallmentDraft(previous => ({ ...previous, id: "existing-installment" })); setInstallmentModal(true); }}>Open Edit Dialog</button>
          <output data-testid="save-status">{saveStatus}</output>
          <output data-testid="save-count">{saveCount}</output>
          {installmentModal && <FeeTemplateInstallmentDialog context={context} />}
        </main>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<FeeInstallmentDialogHarness />);
