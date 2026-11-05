import { beforeEach, describe, expect, it, vi } from "vitest";

// GET /api/notices must only return the notices a parent or student is addressed by,
// and must not tell them who else viewed each notice.
const mocks = vi.hoisted(() => {
  const past = new Date("2026-01-10T00:00:00Z");
  const row = (id: string, board: string, audienceKey: string, extra: Record<string, unknown> = {}) => ({
    id, board, audienceKey, publishAt: past, isPublished: true, academicYear: "2026-2027", noticeType: "News",
    body: id, authorName: "Office", allowReply: false, audience: audienceKey, channelKind: "school", classId: null, routeId: null,
    attachments: [], views: [{ viewerUserId: "other-parent", viewedAt: past }], ...extra,
  });
  return {
    principal: { id: "p1", campusId: "c1", actorType: "GUARDIAN", roles: ["Parent"], permissions: [], studentId: null, guardianId: "g1", childIds: ["stu-1"] } as Record<string, unknown>,
    notices: [
      row("whole-school", "school", "__SCHOOL__"),
      row("teachers-only", "school", "ALL_TEACHERS"),
      row("day-care", "school", "DAY_CARE"),
      row("my-class", "class", "1 (A)"),
      row("other-class", "class", "3 (B)"),
      row("my-route", "route", "Route 7"),
      row("other-route", "route", "Route 9"),
      row("scheduled", "school", "__SCHOOL__", { publishAt: new Date("2999-01-01T00:00:00Z") }),
    ],
    students: [
      {
        id: "stu-1",
        details: { transport: { enabled: "Yes", routeName: "route 7" }, dayCare: { enabled: "No" } },
        enrollments: [{ classId: "class-1", class: { name: "1" }, section: { name: "A" } }],
        transport: null,
        daycare: null,
      },
    ],
    studentQueries: [] as unknown[],
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    notice: { findMany: async () => mocks.notices },
    student: {
      findMany: async (args: unknown) => {
        mocks.studentQueries.push(args);
        return mocks.students;
      },
    },
  },
}));
vi.mock("@/lib/principal", () => ({ principalFromRequest: async () => mocks.principal }));

const list = async () => {
  const { GET } = await import("@/app/api/notices/route");
  const res = await GET(new Request("http://local/api/notices"));
  expect(res.status).toBe(200);
  return (await res.json()) as { notices: Array<Record<string, unknown>> };
};

describe("GET /api/notices audience", () => {
  beforeEach(() => {
    mocks.studentQueries.length = 0;
  });

  it("a parent gets only whole-school, their child's class and their child's route", async () => {
    mocks.principal = { ...mocks.principal, actorType: "GUARDIAN", childIds: ["stu-1"] };
    const body = await list();
    expect(body.notices.map((n) => n.id)).toEqual(["whole-school", "my-class", "my-route"]);
  });

  it("only looks up the parent's own children, in their own school", async () => {
    await list();
    expect(mocks.studentQueries[0]).toMatchObject({ where: { id: { in: ["stu-1"] }, campusId: "c1" } });
  });

  it("a parent sees the view count but not who viewed", async () => {
    const body = await list();
    expect(body.notices[0].views).toBe(1);
    expect(body.notices[0]).not.toHaveProperty("viewRecords");
    expect(body.notices[0].viewedByMe).toBe(false);
  });

  it("staff get every notice with the viewer list", async () => {
    mocks.principal = { ...mocks.principal, actorType: "STAFF", childIds: [] };
    const body = await list();
    expect(body.notices).toHaveLength(mocks.notices.length);
    expect(body.notices[0]).toHaveProperty("viewRecords");
    expect(mocks.studentQueries).toHaveLength(0);
  });
});
