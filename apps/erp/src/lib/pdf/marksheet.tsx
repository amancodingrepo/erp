import { buildSimplePdf } from "./simple";

export type MarksheetView = {
  campusName: string;
  studentName: string;
  admissionNo: string;
  rollNo?: string | null;
  examName: string;
  withheld: boolean;
  subjects: Array<{ name: string; marks: string; maxMarks: string; absent: boolean }>;
};

export function buildMarksheetPdf(data: MarksheetView): Uint8Array {
  return buildSimplePdf([
    data.withheld ? "RESULT WITHHELD" : "MARKSHEET",
    data.campusName,
    `${data.admissionNo}  ${data.studentName}  roll ${data.rollNo ?? "-"}`,
    data.examName,
    ...data.subjects.map(
      (s) =>
        `${s.name}  ${s.absent ? "AB" : s.marks} / ${s.maxMarks}`,
    ),
  ]);
}

export function MarksheetSheet({ data }: { data: MarksheetView }) {
  return (
    <div>
      <h1>{data.withheld ? "Result withheld" : "Marksheet"}</h1>
      <p>{data.campusName}</p>
      <p>
        {data.admissionNo} {data.studentName}
      </p>
    </div>
  );
}
