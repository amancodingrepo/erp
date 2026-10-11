import { describe, expect, it } from "vitest";
import {
  assertCorporateDroppable,
  attachAccessions,
  campusFeeDue,
  dropAccession,
  dropAccessionsByBook,
  dropCorporate,
  nextAccessionNo,
  parseAccessions,
  parseCorporates,
  parseSponsors,
  patchAccessionRow,
  patchCorporateRow,
  payslipLines,
  upsertCorporate,
  upsertSponsor,
} from "./campus-later";

describe("corporates", () => {
  it("keeps one corporate name and one sponsor per live student", () => {
    const corps = upsertCorporate(parseCorporates([]), "Acme Trust");
    expect(corps[0]?.name).toBe("Acme Trust");
    const next = upsertSponsor([], "s1", corps[0]!.id, 12000);
    expect(parseSponsors(next)[0]).toMatchObject({
      studentId: "s1",
      amount: 12000,
    });
  });

  it("renames in place and refuses delete when sponsors exist", () => {
    const corps = upsertCorporate(parseCorporates([]), "Acme Trust");
    const two = upsertCorporate(corps, "Other Trust");
    expect(patchCorporateRow(two, corps[0]!.id, "Acme Ltd")[0]?.name).toBe(
      "Acme Ltd",
    );
    expect(() =>
      patchCorporateRow(two, corps[0]!.id, "Other Trust"),
    ).toThrow();
    const sponsors = upsertSponsor([], "s1", corps[0]!.id, 12000);
    expect(() => assertCorporateDroppable(sponsors, corps[0]!.id)).toThrow();
    expect(dropCorporate(two, corps[0]!.id)).toHaveLength(1);
    expect(() => dropCorporate(two, "missing")).toThrow();
  });
});

describe("library accession", () => {
  it("issues ACC numbers in order onto live books", () => {
    expect(nextAccessionNo([])).toBe("ACC-0001");
    expect(
      nextAccessionNo([{ id: "b1", bookId: "b1", accessionNo: "ACC-0003" }]),
    ).toBe("ACC-0004");
    expect(
      attachAccessions([{ id: "b1", title: "Physics" }], [
        { id: "b1", bookId: "b1", accessionNo: "ACC-0003" },
      ])[0].accessionNo,
    ).toBe("ACC-0003");
    expect(
      dropAccessionsByBook(
        [
          { id: "b1", bookId: "b1", accessionNo: "ACC-0003" },
          { id: "b2", bookId: "b2", accessionNo: "ACC-0004" },
        ],
        "b1",
      ),
    ).toEqual([{ id: "b2", bookId: "b2", accessionNo: "ACC-0004" }]);
  });

  it("patches and drops a row by id, book, or accession number", () => {
    const rows = parseAccessions([
      { bookId: "b1", accessionNo: "ACC-0003" },
      { bookId: "b2", accessionNo: "ACC-0004" },
    ]);
    expect(rows[0]?.id).toBe("b1");
    expect(patchAccessionRow(rows, "ACC-0003", "ACC-0009")[0]?.accessionNo).toBe(
      "ACC-0009",
    );
    expect(() => patchAccessionRow(rows, "b1", "ACC-0004")).toThrow();
    expect(dropAccession(rows, "b1")).toHaveLength(1);
    expect(() => dropAccession(rows, "missing")).toThrow();
  });
});

describe("payslip and org due", () => {
  it("lists PF ESI TDS on the slip and clamps campus fee due", () => {
    const lines = payslipLines({
      campusName: "Main",
      staffName: "Asha Rao",
      employeeId: "EMP-1",
      year: 2026,
      month: 4,
      gross: "50000",
      pf: "1800",
      esi: "375",
      pt: "208",
      tds: "0",
      net: "47617",
    });
    expect(lines[1]).toBe("Payslip 2026-04");
    expect(lines.some((line) => line.includes("PF ₹1800"))).toBe(true);
    expect(lines.some((line) => line.includes("TDS ₹0"))).toBe(true);
    expect(campusFeeDue(1000, 400, 50)).toBe(550);
    expect(campusFeeDue(10, 40, 0)).toBe(0);
  });
});
