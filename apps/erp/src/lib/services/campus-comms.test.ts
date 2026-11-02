import { describe, expect, it } from "vitest";
import {
  absentSmsBody,
  dropClassFlags,
  eventDueForReminder,
  parseClassFlags,
  parseEventReminderLog,
  recordEventReminder,
  upsertClassFlags,
  messageTemplatePatchData,
} from "./campus-comms";

describe("class flags", () => {
  it("stores absent SMS and virtual classroom per class", () => {
    const rows = upsertClassFlags(parseClassFlags([]), {
      classId: "c1",
      sendAbsentSms: true,
      virtualClassroom: true,
    });
    const next = upsertClassFlags(rows, {
      classId: "c1",
      sendAbsentSms: false,
      virtualClassroom: true,
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.sendAbsentSms).toBe(false);
    expect(next[0]?.virtualClassroom).toBe(true);
    expect(dropClassFlags(next, "c1")).toEqual([]);
    expect(() => dropClassFlags(next, "missing")).toThrow();
  });
});

describe("absent SMS copy", () => {
  it("names the student, class, and date", () => {
    expect(absentSmsBody({ studentName: "Ada", className: "1-A", date: "2026-10-05" })).toContain(
      "Ada",
    );
    expect(absentSmsBody({ studentName: "Ada", className: "1-A", date: "2026-10-05" })).toContain(
      "absent",
    );
  });
});

describe("event reminders", () => {
  it("fires once inside the lead window", () => {
    const startsAt = new Date("2026-10-05T12:00:00.000Z");
    const now = new Date("2026-10-05T11:00:00.000Z");
    expect(eventDueForReminder({ id: "e1", startsAt }, now, 24, new Set())).toBe(
      true,
    );
    expect(
      eventDueForReminder({ id: "e1", startsAt }, now, 24, new Set(["e1"])),
    ).toBe(false);
    expect(
      eventDueForReminder(
        { id: "e1", startsAt },
        new Date("2026-10-03T12:00:00.000Z"),
        24,
        new Set(),
      ),
    ).toBe(false);
    const log = recordEventReminder(parseEventReminderLog([]), "e1");
    expect(recordEventReminder(log, "e1")).toHaveLength(1);
  });
});

describe("message templates", () => {
  it("maps name body channel and subject patches", () => {
    expect(
      messageTemplatePatchData(
        { name: "fee_due", channel: "EMAIL", subject: "Due", body: "Hi" },
        { name: " fee_due2 ", subject: "", body: " Hello " },
      ),
    ).toEqual({
      name: "fee_due2",
      channel: "EMAIL",
      body: "Hello",
      subject: null,
    });
    expect(
      messageTemplatePatchData(
        { name: "fee_due", channel: "EMAIL", subject: "Due", body: "Hi" },
        { channel: "SMS" },
      ),
    ).toEqual({ name: "fee_due", channel: "SMS", body: "Hi" });
    expect(() =>
      messageTemplatePatchData(
        { name: "fee_due", channel: "EMAIL", subject: null, body: "Hi" },
        { body: " " },
      ),
    ).toThrow();
    expect(() =>
      messageTemplatePatchData(
        { name: "fee_due", channel: "EMAIL", subject: null, body: "Hi" },
        { name: " " },
      ),
    ).toThrow();
  });
});
