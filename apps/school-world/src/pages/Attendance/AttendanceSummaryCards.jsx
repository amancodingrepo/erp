import React from "react";

export default function AttendanceSummaryCards({ countCards, selectedSummaryCard, setSelectedSummaryCard, t }) {
  return (
      <div className="attendance-register-summary attendance-summary-above-calendar">
        {countCards.map(card => (
          <button
            type="button"
            className={"attendance-summary-card " + card.className + (selectedSummaryCard === card.key ? " is-selected" : "")}
            key={card.key}
            aria-pressed={selectedSummaryCard === card.key}
            onClick={() => setSelectedSummaryCard(current => current === card.key ? null : card.key)}
          >
            <div><strong>{card.value}</strong><span>{t(card.label)}</span></div>
          </button>
        ))}
      </div>
  );
}
