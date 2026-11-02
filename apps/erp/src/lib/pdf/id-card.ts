import { buildSimplePdf } from "./simple";

export type IdCardView = {
  kind: "STUDENT" | "STAFF";
  campusName: string;
  header?: string;
  name: string;
  idNo: string;
  roleLine: string;
  extra?: string[];
};

export function buildIdCardPdf(data: IdCardView): Uint8Array {
  return buildSimplePdf([
    data.header || data.campusName,
    data.kind === "STAFF" ? "STAFF IDENTITY CARD" : "STUDENT IDENTITY CARD",
    data.campusName,
    data.name,
    data.idNo,
    data.roleLine,
    ...(data.extra ?? []),
    `QR ${data.idNo}`,
  ]);
}

export type CertificateView = {
  campusName: string;
  header?: string;
  footer?: string;
  title: string;
  lines: string[];
};

export function buildCertificatePdf(data: CertificateView): Uint8Array {
  return buildSimplePdf([
    data.header || data.campusName,
    data.title.toUpperCase(),
    data.campusName,
    ...data.lines,
    data.footer || "",
  ]);
}
