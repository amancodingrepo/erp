import { buildSimplePdf } from "./simple";

export type AdmitCardView = {
  campusName: string;
  studentName: string;
  admissionNo: string;
  rollNo?: string | null;
  examName: string;
  papers: Array<{ name: string; date?: string | null; startTime?: string | null; roomNo?: string | null }>;
};

export function buildAdmitCardPdf(data: AdmitCardView): Uint8Array {
  return buildSimplePdf([
    "ADMIT CARD",
    data.campusName,
    `${data.admissionNo}  ${data.studentName}  roll ${data.rollNo ?? "-"}`,
    data.examName,
    ...data.papers.map(
      (p) =>
        `${p.name}  ${p.date ?? ""}  ${p.startTime ?? ""}  ${p.roomNo ?? ""}`,
    ),
  ]);
}

export function AdmitCardSheet({ data }: { data: AdmitCardView }) {
  return (
    <div>
      <h1>Admit card</h1>
      <p>{data.campusName}</p>
      <p>
        {data.admissionNo} {data.studentName}
      </p>
    </div>
  );
}
