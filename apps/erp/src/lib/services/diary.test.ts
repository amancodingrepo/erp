import { describe, expect, it } from "vitest";
import {
  assertNoticeShape,
  assertParentMayReply,
  composeChannelNotice,
  feeLedgerFromInvoices,
  isHomeworkType,
  legacyAudienceFromChannel,
  listNoticeChannelsFromLive,
  normalizeNoticeInput,
  noticeWhereForChannel,
  parseChannelId,
  toNoticeReads,
  eventMatchesQuery,
  noticeListFilter,
  noticePublishState,
  notViewedStudents,
  parseNoticeReplies,
  requestCreatedAtFilter,
  threadRootId,
  upsertNoticeReply,
} from "./diary";

describe("feeLedgerFromInvoices", () => {
  it("builds installment rows from invoice lines", () => {
    const ledger = feeLedgerFromInvoices([
      {
        id: "inv1",
        status: "PARTIAL",
        total: 1000,
        paid: 400,
        discount: 50,
        fine: 10,
        createdAt: new Date("2026-01-01"),
        payments: [{ paidAt: new Date("2026-01-10") }],
        master: { group: { name: "Term 1" } },
        lines: [
          {
            id: "l1",
            description: "April tuition",
            amount: 1000,
            paid: 400,
            discount: 50,
            fine: 10,
            dueDate: new Date("2026-04-10"),
            feeType: { name: "Tuition" },
          },
        ],
      },
    ]);
    expect(ledger.totalFees).toBe("1000.00");
    expect(ledger.installments).toHaveLength(1);
    const row = ledger.installments[0]!;
    expect(row.feeTypes).toEqual(["Tuition"]);
    expect(row.totalAmount).toBe(960);
    expect(row.status).toBe("Unpaid");
  });
});

describe("event list filters", () => {
  it("keeps events inside from/to and optional class_id", () => {
    const row = {
      startsAt: new Date("2026-04-10T09:00:00.000Z"),
      classId: "c1",
    };
    expect(
      eventMatchesQuery(row, {
        from: "2026-04-01",
        to: "2026-04-30",
        classId: "c1",
      }),
    ).toBe(true);
    expect(eventMatchesQuery(row, { from: "2026-05-01" })).toBe(false);
    expect(eventMatchesQuery(row, { to: "2026-04-09" })).toBe(false);
    expect(eventMatchesQuery(row, { classId: "c2" })).toBe(false);
    expect(
      eventMatchesQuery({ ...row, classId: null }, { classId: null }),
    ).toBe(true);
    expect(eventMatchesQuery({ ...row, classId: null }, { classId: "c1" })).toBe(
      false,
    );
  });
});

describe("notice replies", () => {
  it("blocks parent replies when enable reply is off", () => {
    expect(() => assertParentMayReply(false)).toThrow();
    expect(() => assertParentMayReply(true)).not.toThrow();
    const rows = upsertNoticeReply(parseNoticeReplies([]), {
      noticeId: "n1",
      body: "Thanks",
      authorRole: "parent",
      studentId: "s1",
    });
    expect(rows[0]?.body).toBe("Thanks");
    expect(() =>
      upsertNoticeReply([], { noticeId: "n1", body: " ", authorRole: "staff" }),
    ).toThrow();
  });
});

describe("notice channels", () => {
  it("maps channel kinds onto the older audience column", () => {
    expect(legacyAudienceFromChannel("school")).toBe("all");
    expect(legacyAudienceFromChannel("teachers")).toBe("staff");
    expect(legacyAudienceFromChannel("class")).toBe("class");
    expect(legacyAudienceFromChannel("daycare")).toBe("students");
    expect(legacyAudienceFromChannel("route")).toBe("students");
  });

  it("allows homework only on a class channel", () => {
    expect(isHomeworkType("homework_worksheet")).toBe(true);
    expect(() =>
      assertNoticeShape({
        channelKind: "school",
        type: "homework_assignment",
      }),
    ).toThrow();
    expect(() =>
      assertNoticeShape({
        channelKind: "class",
        type: "homework_worksheet",
        classId: "c1",
      }),
    ).not.toThrow();
  });

  it("parses virtual channel ids and composes nested notices", () => {
    expect(parseChannelId("school")).toEqual({
      id: "school",
      kind: "school",
    });
    expect(parseChannelId("class:c1")).toEqual({
      id: "class:c1",
      kind: "class",
      classId: "c1",
    });
    expect(parseChannelId("route:r1")).toEqual({
      id: "route:r1",
      kind: "route",
      routeId: "r1",
    });
    expect(noticeWhereForChannel(parseChannelId("class:c1"))).toEqual({
      channelKind: "class",
      classId: "c1",
    });
    expect(
      composeChannelNotice("teachers", { title: "Staff", body: "Meeting" }).channelKind,
    ).toBe("teachers");
    expect(() => parseChannelId("unknown")).toThrow();
    expect(
      listNoticeChannelsFromLive(
        [{ id: "c1", name: "I-A" }],
        [{ id: "r1", name: "North" }],
      ).map((row) => row.id),
    ).toEqual(["school", "teachers", "daycare", "class:c1", "route:r1"]);
  });

  it("aliases notice receipts as reads", () => {
    expect(
      toNoticeReads({
        noticeId: "n1",
        title: "Holiday",
        readCount: 2,
        reads: [{ userId: "u1" }, { userId: "u2" }],
      }),
    ).toEqual({
      noticeId: "n1",
      title: "Holiday",
      readCount: 2,
      read_count: 2,
      reads: [{ userId: "u1" }, { userId: "u2" }],
    });
  });

  it("requires classId or routeId for those channels", () => {
    expect(() =>
      assertNoticeShape({ channelKind: "class", type: "news" }),
    ).toThrow();
    expect(() =>
      assertNoticeShape({ channelKind: "route", type: "alert" }),
    ).toThrow();
  });

  it("fills channel from legacy audience when composing", () => {
    const notice = normalizeNoticeInput({
      title: "Sports day",
      body: "Friday",
      audience: "class",
      classId: "c1",
    });
    expect(notice.channelKind).toBe("class");
    expect(notice.type).toBe("news");
    expect(notice.audience).toBe("class");
    expect(notice.isPublished).toBe(false);
  });

  it("keeps drafts off the published list until approved", () => {
    expect(noticeListFilter(null)).toEqual({ isPublished: true });
    expect(noticeListFilter("pending")).toEqual({ isPublished: false });
    expect(noticeListFilter("all")).toEqual({});
    expect(noticePublishState(false)).toBe("pending");
    expect(noticePublishState(true)).toBe("published");
  });

  it("subtracts readers from expected students", () => {
    const unread = notViewedStudents(
      [
        { id: "s1", firstName: "Asha", lastName: "K" },
        { id: "s2", firstName: "Ram", lastName: null },
      ],
      ["s1", null],
    );
    expect(unread.map((s) => s.id)).toEqual(["s2"]);
  });
});

describe("request helpers", () => {
  it("uses the original id as thread root when threadId is empty", () => {
    expect(threadRootId({ id: "r1", threadId: null })).toBe("r1");
    expect(threadRootId({ id: "r2", threadId: "r1" })).toBe("r1");
  });

  it("builds a createdAt range from fromDate/toDate", () => {
    const range = requestCreatedAtFilter("2026-04-01", "2026-04-30");
    expect(range?.gte?.toISOString().startsWith("2026-04-01")).toBe(true);
    expect(range?.lte).toBeInstanceOf(Date);
    expect(range!.lte!.getTime()).toBeGreaterThan(range!.gte!.getTime());
  });
});
