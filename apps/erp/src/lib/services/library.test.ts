import { describe, expect, it } from "vitest";
import {
  attachLostCopies,
  attachWeedout,
  availableAfterWeedout,
  dropWeedoutByBook,
  dropWeedoutRow,
  libraryFineDesk,
  overdueIssues,
  parseWeedout,
  patchWeedoutRow,
  weededQtyFor,
} from "./library";

describe("library weedout", () => {
  it("reduces available copies from live qty minus open issues and weedout", () => {
    const row = parseWeedout({ bookId: "b1", qty: 2, reason: "damaged" });
    expect(row).toMatchObject({ bookId: "b1", qty: 2, reason: "damaged" });
    expect(weededQtyFor([row], "b1")).toBe(2);
    expect(availableAfterWeedout(10, 1, 2)).toBe(7);
    expect(
      attachWeedout([{ id: "b1", qty: 10, available: 9 }], [row], [{ bookId: "b1", open: 1 }])[0],
    ).toMatchObject({
      weededQty: 2,
      available: 7,
    });
    expect(() => parseWeedout({ bookId: "b1", qty: 0 })).toThrow();
    expect(dropWeedoutByBook([row], "b1")).toEqual([]);
    expect(dropWeedoutByBook([row], "other")).toEqual([row]);
  });

  it("patches and drops a weedout or lost row by id", () => {
    const row = parseWeedout({ bookId: "b1", qty: 2, reason: "damaged" });
    const extra = parseWeedout({ bookId: "b2", qty: 1, reason: "torn" });
    const patched = patchWeedoutRow([row, extra], row.id, { qty: 3, reason: "worn" });
    expect(patched.find((entry) => entry.id === row.id)).toMatchObject({
      qty: 3,
      reason: "worn",
    });
    expect(() => patchWeedoutRow([row], row.id, { qty: 0 })).toThrow();
    expect(dropWeedoutRow([row, extra], row.id)).toEqual([extra]);
    expect(() => dropWeedoutRow([row], "missing")).toThrow();
  });
});

describe("library due fines lost", () => {
  it("flags overdue issues, charged fines, and lost copies", () => {
    const due = new Date("2026-04-01T00:00:00.000Z");
    const now = new Date("2026-04-04T00:00:00.000Z");
    const open = [
      {
        id: "i1",
        dueOn: due,
        book: { title: "Physics" },
        member: { memberNo: "LIB-0001" },
      },
      {
        id: "i2",
        dueOn: new Date("2026-04-10T00:00:00.000Z"),
        book: { title: "Chem" },
        member: { memberNo: "LIB-0002" },
      },
    ];
    expect(overdueIssues(open, now).map((row) => row.id)).toEqual(["i1"]);
    expect(
      libraryFineDesk(
        [
          {
            id: "i3",
            fine: 10,
            dueOn: due,
            book: { title: "Maths" },
            member: { memberNo: "LIB-0003" },
          },
        ],
        overdueIssues(open, now),
        5,
        now,
      ),
    ).toEqual([
      {
        id: "i3",
        title: "Maths",
        memberNo: "LIB-0003",
        dueOn: due,
        fine: "10",
        status: "charged",
      },
      {
        id: "i1",
        title: "Physics",
        memberNo: "LIB-0001",
        dueOn: due,
        fine: "15",
        status: "overdue",
      },
    ]);
    expect(
      attachLostCopies([{ id: "b1", available: 7 }], [
        { id: "l1", bookId: "b1", qty: 2, reason: "missing" },
      ])[0],
    ).toMatchObject({ lostQty: 2, available: 5 });
  });
});
