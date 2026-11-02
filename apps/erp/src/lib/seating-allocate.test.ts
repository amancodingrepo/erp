import { describe, expect, it } from "vitest";
import { allocateSeats } from "./seating-allocate";

describe("seating allocate", () => {
  it("fills blocks in roll order and reports overflow", () => {
    const blocks = [
      { id: "b1", name: "A", capacity: 2 },
      { id: "b2", name: "B", capacity: 1 },
    ];
    const overflow = allocateSeats(
      [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }],
      blocks,
    );
    expect(overflow.ok).toBe(false);
    expect(overflow.overflow).toBe(1);
    const ok = allocateSeats(
      [
        { id: "s2", roll: "02" },
        { id: "s1", roll: "01" },
      ],
      [{ id: "b1", name: "A", capacity: 2 }],
    );
    expect(ok.ok).toBe(true);
    expect(ok.seats.map((s) => s.seatNo)).toEqual(["A-01", "A-02"]);
    expect(ok.seats[0]?.studentId).toBe("s1");
  });
});
