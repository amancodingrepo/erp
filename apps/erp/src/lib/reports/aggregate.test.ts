import { describe, expect, it } from "vitest";
import {
  dailyAttendanceRows,
  libraryIssueRows,
  noticeViewRows,
  payrollSlipRows,
  reportLabel,
  storeOrderRows,
  strengthRows,
  visitorRows,
  resultSummaryRows,
  examAbsentRows,
  consolidatedPerformanceRows,
  fuelLogRows,
} from "./aggregate";

describe("strengthRows", () => {
  it("counts by class, section, and whatever gender values are present", () => {
    const rows = strengthRows([
      { className: "5", sectionName: "A", gender: "MALE" },
      { className: "5", sectionName: "A", gender: "MALE" },
      { className: "5", sectionName: "A", gender: "FEMALE" },
      { className: "6", sectionName: "B", gender: null },
    ]);
    expect(rows).toEqual([
      { class: "5", section: "A", gender: "FEMALE", count: 1 },
      { class: "5", section: "A", gender: "MALE", count: 2 },
      { class: "6", section: "B", gender: "", count: 1 },
    ]);
  });
});

describe("dailyAttendanceRows", () => {
  it("counts each status that appears, without a fixed status list", () => {
    const rows = dailyAttendanceRows([
      {
        date: new Date("2026-04-01T00:00:00.000Z"),
        className: "5",
        sectionName: "A",
        status: "PRESENT",
      },
      {
        date: "2026-04-01",
        className: "5",
        sectionName: "A",
        status: "PRESENT",
      },
      {
        date: "2026-04-01",
        className: "5",
        sectionName: "A",
        status: "LEAVE",
      },
    ]);
    expect(rows).toEqual([
      { date: "2026-04-01", class: "5", section: "A", status: "LEAVE", count: 1 },
      { date: "2026-04-01", class: "5", section: "A", status: "PRESENT", count: 2 },
    ]);
  });
});

describe("noticeViewRows", () => {
  it("uses stored channel and type, and counts reads per notice", () => {
    const rows = noticeViewRows(
      [
        {
          id: "n1",
          title: "Holiday",
          channelKind: "school",
          type: "alert",
          publishAt: new Date("2026-04-02T00:00:00.000Z"),
        },
        {
          id: "n2",
          title: "Worksheet",
          channelKind: "class",
          type: "homework_worksheet",
          publishAt: new Date("2026-04-03T00:00:00.000Z"),
        },
      ],
      [{ noticeId: "n1" }, { noticeId: "n1" }],
    );
    expect(rows[0]).toMatchObject({
      title: "Holiday",
      channel: "school",
      type: "alert",
      readCount: 2,
    });
    expect(rows[1]?.readCount).toBe(0);
  });
});

describe("reportLabel", () => {
  it("turns a key into a label without a lookup table", () => {
    expect(reportLabel("notice-views")).toBe("notice views");
  });
});

describe("fuelLogRows", () => {
  it("keeps live fill rows for the transport fuel grain", () => {
    expect(
      fuelLogRows([
        {
          vehicleId: "v1",
          litres: 20,
          amount: 500,
          odometer: 1200,
          at: "2026-04-01T07:00:00.000Z",
          note: "depot",
        },
      ]),
    ).toEqual([
      {
        vehicleId: "v1",
        litres: 20,
        amount: 500,
        odometer: 1200,
        at: "2026-04-01",
        note: "depot",
      },
    ]);
  });
});

describe("performance analytics grains", () => {
  it("summarizes live marks, lists absents, and consolidates per student", () => {
    const marks = [
      { student: "Asha", exam: "Term 1", subject: "Math", marks: 80, isAbsent: false },
      { student: "Ravi", exam: "Term 1", subject: "Math", marks: 60, isAbsent: false },
      { student: "Ida", exam: "Term 1", subject: "Math", marks: null, isAbsent: true },
    ];
    expect(resultSummaryRows(marks)[0]).toMatchObject({
      exam: "Term 1",
      subject: "Math",
      students: 3,
      present: 2,
      absent: 1,
      average: 70,
    });
    expect(examAbsentRows(marks)).toEqual([
      { student: "Ida", exam: "Term 1", subject: "Math" },
    ]);
    expect(consolidatedPerformanceRows(marks).find((row) => row.student === "Asha")).toMatchObject({
      exam: "Term 1",
      total: 80,
      count: 1,
      average: 80,
      absences: 0,
    });
  });
});

describe("later report grains", () => {
  it("maps live library payroll visitor and store rows", () => {
    expect(
      libraryIssueRows([
        {
          title: "Physics",
          memberNo: "M1",
          issuedAt: "2026-04-01",
          dueOn: "2026-04-08",
          returnedAt: null,
          fine: 0,
        },
      ])[0],
    ).toMatchObject({ title: "Physics", returned: "no" });
    expect(
      payrollSlipRows([
        {
          employeeId: "E1",
          name: "Asha",
          year: 2026,
          month: 4,
          gross: 50000,
          pf: 1800,
          esi: 375,
          tds: 0,
          net: 47617,
        },
      ])[0].period,
    ).toBe("2026-04");
    expect(
      visitorRows([
        {
          name: "Ravi",
          purpose: "Meeting",
          inAt: "2026-04-01T09:00:00.000Z",
          outAt: null,
        },
      ])[0].purpose,
    ).toBe("Meeting");
    expect(
      storeOrderRows([
        {
          studentId: "s1",
          itemId: "i1",
          qty: 2,
          amount: 900,
          source: "parent",
          status: "open",
        },
      ])[0].source,
    ).toBe("parent");
  });
});
