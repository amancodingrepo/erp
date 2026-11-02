import { apiPost } from "../../api.js";

export default function useFeesReminderActions({ reminderBusy, setReminderBusy, manageYear, manageClass, feeRows, notify, onOpenStudent }) {
  async function sendFeeRemindersToStudents({ allClasses = false } = {}) {
    if (reminderBusy) return;
    const academicYear = String(manageYear || "").trim();
    if (!academicYear) {
      notify("Select an academic year before sending fee reminders.");
      return;
    }
    if (!allClasses && !manageClass) {
      notify("Select a class first, or use Send Fee Reminder to All Classes.");
      return;
    }
    const candidatesByCode = new Map();
    feeRows.forEach(fee => {
      if (String(fee.academicYear || "") !== academicYear || fee.balance <= 0) return;
      if (!allClasses && String(fee.className || "") !== String(manageClass)) return;
      const code = String(fee.studentCode || "");
      if (!code) return;
      if (!candidatesByCode.has(code)) candidatesByCode.set(code, { code, name: fee.studentName || code });
    });
    const candidates = [...candidatesByCode.values()];
    if (!candidates.length) {
      notify("No students with outstanding fees were found for " + academicYear + (allClasses ? "." : " in class " + manageClass + "."));
      return;
    }
    const scope = allClasses ? "all classes" : "class " + manageClass;
    const confirmed = window.confirm("Create fee-reminder messages for " + candidates.length + " student(s) in " + scope + " for academic year " + academicYear + "? Only linked active parent accounts will receive an inbox message. No email or SMS will be sent by this action.");
    if (!confirmed) return;
    setReminderBusy(true);
    let sent = 0;
    const failed = [];
    try {
      for (const candidate of candidates) {
        try {
          await apiPost("/students/" + encodeURIComponent(candidate.code) + "/fee-reminder", { academicYear });
          sent += 1;
        } catch (error) {
          failed.push({ name: candidate.name, message: error?.message || "Reminder could not be created." });
        }
      }
      let message = "Fee reminders created for " + sent + " student(s).";
      if (failed.length) {
        const samples = failed.slice(0, 3).map(item => item.name + ": " + item.message).join(" | ");
        message += " " + failed.length + " could not be sent. " + samples;
        if (failed.length > 3) message += " | And " + (failed.length - 3) + " more.";
      }
      notify(message);
    } finally {
      setReminderBusy(false);
    }
  }
  function openStudentFees(summary) {
    if (summary.student && onOpenStudent) {
      onOpenStudent(summary.student, "Fees");
      return;
    }
    notify("Could not open the Fees tab because Student ID " + summary.studentCode + " was not found in the loaded student list.");
  }
  return { sendFeeRemindersToStudents, openStudentFees };
}
