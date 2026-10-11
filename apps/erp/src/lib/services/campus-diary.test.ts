import { describe, expect, it } from "vitest";
import {
  parentDiary,
  parseDiaryEntries,
  removeDiaryEntry,
  upsertDiaryEntry,
} from "./campus-diary";
import {
  attachNoticeMedia,
  parseNoticeAttachments,
  upsertNoticeAttachment,
} from "./diary";

describe("student media diary", () => {
  it("stores a note without a url and requires https for media", () => {
    const note = upsertDiaryEntry(parseDiaryEntries([]), {
      studentId: "s1",
      kind: "note",
      caption: "Circle time",
    });
    expect(note[0]?.kind).toBe("note");
    expect(note[0]?.url).toBe("");
    const photo = upsertDiaryEntry(note, {
      studentId: "s1",
      kind: "photo",
      url: "https://files.example/circle.jpg",
      caption: "Art",
    });
    expect(photo[1]?.url).toContain("https://");
    const hosted = upsertDiaryEntry([], {
      studentId: "s1",
      kind: "photo",
      url: "/api/v1/files/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    });
    expect(hosted[0]?.url).toBe(
      "/api/v1/files/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    );
    expect(() =>
      upsertDiaryEntry([], {
        studentId: "s1",
        kind: "video",
        url: "http://files.example/x.mp4",
      }),
    ).toThrow();
  });

  it("filters parent rows by student and can remove an entry", () => {
    const rows = upsertDiaryEntry(
      upsertDiaryEntry([], {
        studentId: "s1",
        kind: "note",
        caption: "A",
      }),
      { studentId: "s2", kind: "note", caption: "B" },
    );
    expect(parentDiary(rows, "s1")).toHaveLength(1);
    expect(removeDiaryEntry(rows, rows[0]!.id)).toHaveLength(1);
  });

  it("tags daycare notes separately from the student diary", () => {
    const rows = upsertDiaryEntry(parseDiaryEntries([]), {
      studentId: "s1",
      kind: "note",
      caption: "Slept well",
      channel: "daycare",
    });
    expect(rows[0]?.channel).toBe("daycare");
    expect(
      upsertDiaryEntry([], { studentId: "s1", kind: "note", channel: "student" })[0]
        ?.channel,
    ).toBe("student");
  });
});

describe("notice attachments", () => {
  it("keeps https files on a notice and hides http", () => {
    const rows = upsertNoticeAttachment(parseNoticeAttachments([]), {
      noticeId: "n1",
      name: "Sports day",
      url: "https://files.example/sports.pdf",
    });
    expect(attachNoticeMedia([{ id: "n1" }], rows)[0]?.attachments).toHaveLength(
      1,
    );
    expect(() =>
      upsertNoticeAttachment([], {
        noticeId: "n1",
        name: "Bad",
        url: "http://files.example/x.pdf",
      }),
    ).toThrow();
    const hosted = upsertNoticeAttachment([], {
      noticeId: "n1",
      name: "Hosted",
      url: "/api/v1/files/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    });
    expect(hosted[0]?.url).toContain("/api/v1/files/");
  });
});
