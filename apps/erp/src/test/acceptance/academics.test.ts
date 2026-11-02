import { beforeAll, describe, expect, it } from "vitest";
import { GET as classesGet, POST as classesPost } from "@/app/api/v1/classes/route";
import { POST as departmentsPost } from "@/app/api/v1/departments/route";
import { POST as programsPost } from "@/app/api/v1/programs/route";
import { POST as sectionsPost } from "@/app/api/v1/sections/route";
import { GET as sessionsGet, POST as sessionsPost } from "@/app/api/v1/sessions/route";
import { POST as activateSession } from "@/app/api/v1/sessions/[id]/activate/route";
import { prisma } from "@/lib/db";
import { json, login, req } from "./helpers";

const suffix = `acc-acad-${Date.now()}`;

describe("acceptance Academics", () => {
  let token: string;
  let campusId: string;
  let originalSessionId: string | null;
  let programId: string;
  let fyClassId: string;

  beforeAll(async () => {
    const auth = await login("admin");
    if (!auth.token) throw new Error("login failed");
    token = auth.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus) throw new Error("seed campus missing");
    campusId = campus.id;
    originalSessionId = campus.currentSessionId;
  });

  it("Create session and mark current; lists default to it", async () => {
    const created = await json(
      await sessionsPost(
        req("POST", "/api/v1/sessions", token, {
          name: `2026-27 ${suffix}`,
          code: `ACC-${suffix}`,
          sequenceNo: 91,
          startDate: "2026-06-01",
          endDate: "2027-05-31",
        }),
      ),
    );
    expect(created.status).toBe(201);
    const sessionId = (created.body as { id: string }).id;
    const activated = await json(
      await activateSession(
        req("POST", `/api/v1/sessions/${sessionId}/activate`, token),
        { params: Promise.resolve({ id: sessionId }) },
      ),
    );
    expect(activated.status).toBe(200);
    const sessions = await json(await sessionsGet(req("GET", "/api/v1/sessions", token)));
    expect(sessions.body.currentSessionId).toBe(sessionId);
    const classes = await json(await classesGet(req("GET", "/api/v1/classes", token)));
    expect(classes.body.sessionId).toBe(sessionId);

    if (originalSessionId) {
      await prisma.$transaction([
        prisma.academicSession.updateMany({
          where: { campusId },
          data: { isCurrent: false },
        }),
        prisma.academicSession.update({
          where: { id: originalSessionId },
          data: { isCurrent: true, isActive: true },
        }),
        prisma.campus.update({
          where: { id: campusId },
          data: { currentSessionId: originalSessionId },
        }),
      ]);
    }
  });

  it("Create program UG, class FY, two sections A/B", async () => {
    const dept = await json(
      await departmentsPost(
        req("POST", "/api/v1/departments", token, {
          name: `Science ${suffix}`,
          code: `SCI-${suffix}`,
        }),
      ),
    );
    const program = await json(
      await programsPost(
        req("POST", "/api/v1/programs", token, {
          departmentId: (dept.body as { id: string }).id,
          name: `B.Sc ${suffix}`,
          level: "UNDERGRADUATE",
        }),
      ),
    );
    expect(program.status).toBe(201);
    programId = (program.body as { id: string }).id;
    const fy = await json(
      await classesPost(
        req("POST", "/api/v1/classes", token, {
          programId,
          name: `FY ${suffix}`,
          yearNo: 1,
          sectionNames: ["A", "B"],
        }),
      ),
    );
    expect(fy.status).toBe(201);
    fyClassId = (fy.body as { id: string }).id;
    const names = (fy.body as { sections: { name: string }[] }).sections.map(
      (s) => s.name,
    );
    expect(names.sort()).toEqual(["A", "B"]);
  });

  it("Cannot create two sections named A in the same class", async () => {
    const dup = await json(
      await sectionsPost(
        req("POST", "/api/v1/sections", token, { classId: fyClassId, name: "A" }),
      ),
    );
    expect(dup.status).toBe(409);
  });
});
