import { buildSimplePdf } from "./simple";

export type ReceiptView = {
  campusName: string;
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  amount: string;
  discount: string;
  fine: string;
  method: string;
  paidAt: string;
  note?: string | null;
  cancelled: boolean;
  header?: string;
  footer?: string;
  lines: Array<{ description: string; amount: string; paid: string; balance: string }>;
};

/** Minimal one-page PDF so receipts print without a browser. */
export function buildReceiptPdf(data: ReceiptView): Uint8Array {
  return buildSimplePdf([
    data.header || data.campusName,
    data.cancelled ? "*** CANCELLED ***" : "FEE RECEIPT",
    data.campusName,
    `Receipt ${data.receiptNo}`,
    `${data.admissionNo}  ${data.studentName}`,
    `Amount INR ${data.amount}  Discount ${data.discount}  Fine ${data.fine}`,
    `Mode ${data.method}  Date ${data.paidAt}`,
    ...data.lines.map(
      (line) =>
        `${line.description}  amt ${line.amount}  paid ${line.paid}  bal ${line.balance}`,
    ),
    data.note ? `Note ${data.note}` : "",
    data.footer ? data.footer : "",
  ]);
}

export function ReceiptSheet({ data }: { data: ReceiptView }) {
  return (
    <div>
      {data.cancelled ? <p>CANCELLED</p> : <p>FEE RECEIPT</p>}
      <h1>{data.campusName}</h1>
      <p>{data.receiptNo}</p>
      <p>
        {data.admissionNo} {data.studentName}
      </p>
      <p>
        Amount {data.amount} Discount {data.discount} Fine {data.fine}
      </p>
      <p>
        {data.method} {data.paidAt}
      </p>
    </div>
  );
}
