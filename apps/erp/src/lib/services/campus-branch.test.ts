import { describe, expect, it } from "vitest";
import {
  birthdayWhen,
  dropAttendanceMode,
  dropEligibility,
  eligibilityAllows,
  parentMayMessage,
  parseAttendanceModes,
  parseEligibility,
  parseExternalLinks,
  parsePrincipals,
  parseWebsite,
  patchAttendanceModeRow,
  patchEligibilityRow,
  patchExternalLinkRow,
  dropExternalLink,
  upsertAttendanceMode,
  upsertEligibility,
  upsertExternalLink,
  upsertPrincipal,
  upsertWebsite,
} from "./campus-branch";

describe("birthday window", () => {
  it("classifies past, today, and upcoming by month-day", () => {
    const today = new Date("2026-10-02T00:00:00.000Z");
    expect(birthdayWhen(new Date("2010-10-02T00:00:00.000Z"), today, 7, 7)).toBe(
      "today",
    );
    expect(birthdayWhen(new Date("2010-10-05T00:00:00.000Z"), today, 7, 7)).toBe(
      "upcoming",
    );
    expect(birthdayWhen(new Date("2010-09-28T00:00:00.000Z"), today, 7, 7)).toBe(
      "past",
    );
    expect(birthdayWhen(new Date("2010-01-01T00:00:00.000Z"), today, 7, 7)).toBeNull();
  });
});

describe("class eligibility", () => {
  it("keeps a birth-date window per class and matches dob", () => {
    const rows = upsertEligibility(parseEligibility([]), {
      classId: "c1",
      fromBirthDate: "2018-04-01",
      toBirthDate: "2019-03-31",
    });
    expect(eligibilityAllows(new Date("2018-06-01T00:00:00.000Z"), rows[0]!)).toBe(
      true,
    );
    expect(eligibilityAllows(new Date("2017-01-01T00:00:00.000Z"), rows[0]!)).toBe(
      false,
    );
  });

  it("patches in place by id and drops by id", () => {
    const first = upsertEligibility(parseEligibility([]), {
      classId: "c1",
      fromBirthDate: "2018-04-01",
      toBirthDate: "2019-03-31",
    });
    const two = upsertEligibility(first, {
      classId: "c2",
      fromBirthDate: "2017-04-01",
      toBirthDate: "2018-03-31",
    });
    const patched = patchEligibilityRow(two, first[0]!.id, {
      fromBirthDate: "2018-05-01",
    });
    expect(patched.find((row) => row.id === first[0]!.id)?.fromBirthDate).toBe(
      "2018-05-01",
    );
    expect(patched.find((row) => row.classId === "c2")?.toBirthDate).toBe(
      "2018-03-31",
    );
    expect(() =>
      patchEligibilityRow(two, first[0]!.id, { classId: "c2" }),
    ).toThrow();
    expect(dropEligibility(two, first[0]!.id)).toHaveLength(1);
    expect(() => dropEligibility(two, "missing")).toThrow();
  });
});

describe("one-way communication", () => {
  it("blocks parent messages to listed roles", () => {
    expect(parentMayMessage(["Teacher", "Principal"], ["Teacher"])).toBe(false);
    expect(parentMayMessage(["Teacher"], ["BranchAdmin"])).toBe(true);
    expect(parentMayMessage([], ["Teacher"])).toBe(true);
  });
});

describe("external links", () => {
  it("stores https school urls", () => {
    const rows = upsertExternalLink(parseExternalLinks([]), {
      title: "Website",
      url: "https://school.example",
    });
    expect(rows[0]?.url.startsWith("https://")).toBe(true);
    expect(() =>
      upsertExternalLink([], { title: "Bad", url: "http://school.example" }),
    ).toThrow();
  });

  it("renames by id and drops by id", () => {
    const rows = upsertExternalLink(parseExternalLinks([]), {
      title: "Website",
      url: "https://school.example",
    });
    expect(
      patchExternalLinkRow(rows, rows[0]!.id, { title: " Portal " })[0],
    ).toMatchObject({ id: rows[0]!.id, title: "Portal" });
    expect(() =>
      patchExternalLinkRow(rows, rows[0]!.id, { url: "http://school.example" }),
    ).toThrow();
    expect(dropExternalLink(rows, rows[0]!.id)).toEqual([]);
    expect(() => dropExternalLink(rows, "missing")).toThrow();
  });
});

describe("campus website", () => {
  it("strips html, requires https logo, and stays unpublished until set", () => {
    const row = upsertWebsite(parseWebsite(null), {
      tagline: "Hello <b>school</b>",
      about: "<script>x</script>Welcome",
      logoUrl: "https://files.example/logo.png",
    });
    expect(row.tagline).toBe("Hello school");
    expect(row.about).toBe("Welcome");
    expect(row.published).toBe(false);
    expect(row.logoUrl).toContain("https://");
    expect(() =>
      upsertWebsite(row, { logoUrl: "http://files.example/x.png" }),
    ).toThrow();
    expect(upsertWebsite(row, { published: true }).published).toBe(true);
  });
});

describe("principals", () => {
  it("assigns one principal per class", () => {
    const first = upsertPrincipal(parsePrincipals([]), {
      classId: "c1",
      staffId: "st1",
      signatureUrl: "https://sig.example/a.png",
    });
    const next = upsertPrincipal(first, { classId: "c1", staffId: "st2" });
    expect(next).toHaveLength(1);
    expect(next[0]?.staffId).toBe("st2");
  });
});

describe("attendance modes", () => {
  it("adds unique named capture modes", () => {
    const rows = upsertAttendanceMode(parseAttendanceModes([]), { name: "RFID" });
    expect(upsertAttendanceMode(rows, { name: "rfid" })).toHaveLength(1);
  });

  it("renames by id and drops by id", () => {
    const first = upsertAttendanceMode(parseAttendanceModes([]), { name: "RFID" });
    const two = upsertAttendanceMode(first, { name: "Biometric" });
    expect(patchAttendanceModeRow(two, first[0]!.id, "Manual")[0]?.name).toBe(
      "Manual",
    );
    expect(() => patchAttendanceModeRow(two, first[0]!.id, "biometric")).toThrow();
    expect(dropAttendanceMode(two, first[0]!.id)).toHaveLength(1);
    expect(() => dropAttendanceMode(two, "missing")).toThrow();
  });
});
