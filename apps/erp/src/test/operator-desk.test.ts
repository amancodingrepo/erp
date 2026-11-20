import { describe, expect, it } from "vitest";
import { GET as studentsGet } from "@/app/api/students/route";
import { POST as switchPost } from "@/app/api/v1/auth/switch-campus/route";
import { GET as orgsGet, POST as orgsPost } from "@/app/api/v1/orgs/route";
import { PATCH as orgPatch } from "@/app/api/v1/orgs/[id]/route";
import { GET as branchesGet } from "@/app/api/v1/orgs/[id]/branches/route";
import { prisma } from "@/lib/db";
import { json, req } from "./acceptance/helpers";
import { godToken } from "./platform-god";

describe("operator desk", () => {
  it("lists Main Campus, opens only that school's students, and audits the switch", async () => {
    const main = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!main) throw new Error("MAIN campus missing");
    const mainActive = main.isActive;
    const token = await godToken();

    const listed = await json(await orgsGet(req("GET", "/api/v1/orgs", token)));
    expect(listed.status).toBe(200);
    const orgs = listed.body.data as Array<{
      id: string;
      code: string;
      active: boolean;
      campuses: Array<{ id: string; code: string | null; studentCount: number; principalUsername: string | null }>;
    }>;
    const mainCampus = orgs.flatMap((org) => org.campuses).find((campus) => campus.id === main.id);
    expect(mainCampus?.code).toBe("MAIN");
    expect(mainCampus?.principalUsername).toBeTruthy();

    const mainOrg = orgs.find((org) => org.campuses.some((campus) => campus.id === main.id));
    if (!mainOrg) throw new Error("MAIN organisation missing");
    const branches = await json(
      await branchesGet(req("GET", `/api/v1/orgs/${mainOrg.id}/branches`, token), {
        params: Promise.resolve({ id: mainOrg.id }),
      }),
    );
    expect(branches.status).toBe(200);
    const branchRows = branches.body.data as Array<{ id: string; studentCount?: number }>;
    expect(branchRows.some((row) => row.id === main.id)).toBe(true);

    const openedMain = await json(
      await switchPost(req("POST", "/api/v1/auth/switch-campus", token, { campusId: main.id })),
    );
    expect(openedMain.status).toBe(200);
    expect((openedMain.body.campus as { code?: string }).code).toBe("MAIN");
    const mainStudents = await json(
      await studentsGet(req("GET", "/api/students", String(openedMain.body.token))),
    );
    expect(mainStudents.status).toBe(200);
    const mainIds = ((mainStudents.body.students as Array<{ id: string }>) ?? []).map((row) => row.id);
    const stored = await prisma.student.findMany({
      where: { campusId: main.id },
      select: { admissionNo: true },
      take: 500,
    });
    expect(mainIds.length).toBe(stored.length);
    expect(mainIds.every((id) => stored.some((row) => row.admissionNo === id))).toBe(true);

    const switchAudit = await prisma.auditLog.findFirst({
      where: { action: "switch", entity: "campus", entityId: main.id },
      orderBy: { createdAt: "desc" },
    });
    expect(switchAudit?.after).toMatchObject({ campusId: main.id, orgId: main.orgId });

    const code = `D${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const created = await json(
      await orgsPost(req("POST", "/api/v1/orgs", token, { name: `Desk ${code}`, code })),
    );
    expect(created.status).toBe(201);
    const campus = created.body.campus as { id: string };
    const openedOther = await json(
      await switchPost(req("POST", "/api/v1/auth/switch-campus", token, { campusId: campus.id })),
    );
    expect(openedOther.status).toBe(200);
    const otherStudents = await json(
      await studentsGet(req("GET", "/api/students", String(openedOther.body.token))),
    );
    expect(otherStudents.status).toBe(200);
    const otherIds = ((otherStudents.body.students as Array<{ id: string }>) ?? []).map((row) => row.id);
    expect(otherIds.some((id) => mainIds.includes(id))).toBe(false);

    const orgId = String(created.body.id);
    const suspended = await json(
      await orgPatch(req("PATCH", `/api/v1/orgs/${orgId}`, token, { isActive: false }), {
        params: Promise.resolve({ id: orgId }),
      }),
    );
    expect(suspended.status).toBe(200);
    expect(suspended.body.active).toBe(false);
    const suspendedCampus = await prisma.campus.findUnique({ where: { id: campus.id } });
    expect(suspendedCampus?.isActive).toBe(false);
    const mainAfter = await prisma.campus.findUnique({ where: { id: main.id } });
    expect(mainAfter?.isActive).toBe(mainActive);
    expect(mainAfter?.currentSessionId).toBe(main.currentSessionId);

    const restored = await json(
      await orgPatch(req("PATCH", `/api/v1/orgs/${orgId}`, token, { isActive: true }), {
        params: Promise.resolve({ id: orgId }),
      }),
    );
    expect(restored.status).toBe(200);
    expect(restored.body.active).toBe(true);
  }, 120000);
});
