import { describe, expect, it } from "vitest";
import { parentPhoneOveruseMessage, resolveAcademicYearName, tenDigitMobile } from "./bulk-student-rules";

describe("bulk student academic year", () => {
  it("attaches the long excel year to the existing short session", () => {
    const resolved = resolveAcademicYearName("2025-2026", [{ name: "2025-26" }, { name: "2026-27" }], "2025-26");
    expect(resolved).toEqual({ name: "2025-26", matchedExisting: true, ambiguous: [] });
  });

  it("attaches the short excel year to the existing long session", () => {
    const resolved = resolveAcademicYearName("2026-27", [{ name: "2026-2027" }], "2026-2027");
    expect(resolved.name).toBe("2026-2027");
    expect(resolved.matchedExisting).toBe(true);
  });

  it("keeps a different year so a new session can be created", () => {
    const resolved = resolveAcademicYearName("2024-25", [{ name: "2025-26" }], "2025-26");
    expect(resolved).toEqual({ name: "2024-25", matchedExisting: false, ambiguous: [] });
  });

  it("uses the campus current session when both spellings already exist", () => {
    const resolved = resolveAcademicYearName(
      "2025-2026",
      [{ name: "2025-26" }, { name: "2025-2026" }],
      "2025-26",
    );
    expect(resolved.name).toBe("2025-26");
    expect(resolved.ambiguous).toEqual([]);
  });

  it("reports both spellings when neither is the current session", () => {
    const resolved = resolveAcademicYearName(
      "2025-2026",
      [{ name: "2025-26" }, { name: "2025-2026" }],
      "2026-27",
    );
    expect(resolved.ambiguous).toEqual(["2025-26", "2025-2026"]);
  });
});

describe("bulk student mobile", () => {
  it("accepts a 10 digit number and rejects shorter or longer values", () => {
    expect(tenDigitMobile("98765 43210")).toBe("9876543210");
    expect(tenDigitMobile("987654321")).toBeNull();
    expect(tenDigitMobile("98765432101")).toBeNull();
    expect(tenDigitMobile("+91 9876543210")).toBeNull();
  });

  it("names the phone and the earlier uses when a contact number exceeds 3", () => {
    expect(parentPhoneOveruseMessage("9876543210", 0, [2, 3, 4])).toBe(
      "Parent Phone 9876543210 cannot be used more than 3 times. It also appears on Excel rows 2, 3, 4.",
    );
    expect(parentPhoneOveruseMessage("9876543210", 3, [])).toBe(
      "Parent Phone 9876543210 cannot be used more than 3 times. It is already used by 3 students.",
    );
  });
});
