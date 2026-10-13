import { describe, expect, it } from "vitest";
import {
  applicationNoFor,
  attachInvoiceNos,
  attachSessionPrefixes,
  formatSessionNumber,
  nextSeqFromLast,
  parseInvoiceNos,
  sessionSeqKey,
  parseSessionPrefixes,
  prefixForSession,
  sanitizePrefix,
  dropSessionPrefix,
  getSessionPrefixRow,
  upsertInvoiceNo,
  upsertSessionPrefix,
} from "./campus-session-prefixes";

describe("academic year prefixes", () => {
  it("stores one prefix row per session and formats receipt, invoice, and admission numbers", () => {
    expect(sanitizePrefix(" rcp-26 ", "RCP")).toBe("RCP26");
    expect(sanitizePrefix("  ", "RCP")).toBe("RCP");
    expect(formatSessionNumber("RCP", "2026-27", 1, 5)).toBe("RCP-2026-27-00001");
    expect(sessionSeqKey("receipt", "s1")).toBe("fees.receiptSeq.s1");
    expect(sessionSeqKey("invoice", "s1")).toBe("fees.invoiceSeq.s1");
    expect(nextSeqFromLast(undefined, "ADM-2026-", 1001)).toBe(1001);
    expect(nextSeqFromLast("ADM-2026-1001", "ADM-2026-", 1001)).toBe(1002);

    const rows = upsertSessionPrefix(parseSessionPrefixes([]), {
      sessionId: "y1",
      receiptPrefix: "fee",
      invoicePrefix: "inv",
      admissionPrefix: "adm",
      firstAdmissionNo: 1001,
    });
    expect(rows).toHaveLength(1);
    expect(prefixForSession(rows, "y1")).toMatchObject({
      receiptPrefix: "FEE",
      invoicePrefix: "INV",
      admissionPrefix: "ADM",
      firstAdmissionNo: 1001,
    });
    expect(
      upsertSessionPrefix(rows, { sessionId: "y1", receiptPrefix: "rcp" }),
    ).toHaveLength(1);
    expect(prefixForSession(rows, "missing").receiptPrefix).toBe("");

    expect(
      applicationNoFor(prefixForSession(rows, "y1"), 2026, undefined),
    ).toBe("ADM-2026-1001");
    expect(
      attachSessionPrefixes([{ id: "y1", name: "2026-27" }], rows)[0],
    ).toMatchObject({
      receiptPrefix: "FEE",
      invoicePrefix: "INV",
      admissionPrefix: "ADM",
      firstAdmissionNo: 1001,
    });

    const nos = upsertInvoiceNo(parseInvoiceNos([]), "inv1", "INV-2026-27-00001");
    expect(upsertInvoiceNo(nos, "inv1", "INV-2026-27-00002")).toHaveLength(1);
    expect(attachInvoiceNos([{ id: "inv1" }], nos)[0]).toMatchObject({
      invoiceNo: "INV-2026-27-00001",
    });
    expect(() =>
      upsertSessionPrefix([], { sessionId: " ", receiptPrefix: "RCP" }),
    ).toThrow();
    expect(() =>
      upsertSessionPrefix([], { sessionId: "y1", firstAdmissionNo: 0 }),
    ).toThrow();
    expect(dropSessionPrefix(rows, "y1")).toEqual([]);
    expect(dropSessionPrefix(rows, "missing")).toEqual(rows);
    expect(getSessionPrefixRow(rows, "y1").receiptPrefix).toBe("FEE");
    expect(() => getSessionPrefixRow(rows, "missing")).toThrow();
  });
});
