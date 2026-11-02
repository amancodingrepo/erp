export function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
export { parseCsvRows as parseCsv, downloadCsvFile as downloadCsv } from "../../../shared/csvUtils.js";

export const columnAliases = {
  studentCode: ["studentid", "studentcode", "studentnumber", "admissionnumber"],
  academicYear: ["academicyear", "year"],
  feeName: ["feename", "feetype", "feenametype"],
  installmentName: ["installment", "installmentname", "installmentno", "installmentnumber", "instalment", "instalmentname", "instalmentno", "installmenttype"],
  amount: ["amount", "feeamount", "totalamount"],
  amountPaid: ["amountpaid", "paidamount", "paid"],
  dueDate: ["duedate", "paymentduedate"],
  reference: ["reference", "paymentreference", "notes"]
};
