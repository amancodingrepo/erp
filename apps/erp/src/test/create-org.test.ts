import { describe, expect, it } from "vitest";
import { GET as orgsGet, POST as orgsPost } from "@/app/api/v1/orgs/route";
import { POST as switchPost } from "@/app/api/v1/auth/switch-campus/route";
import { prisma } from "@/lib/db";
import { login, req, json } from "./acceptance/helpers";
import { godToken } from "./platform-god";

type CampusRow = {
  id: string;
  code: string | null;
  currentSessionId: string | null;
  academicYear: string | null;
};

type OrgRow = {
  id: string;
  name: string;
  code: string;
  campuses: CampusRow[];
};

describe("create organisation", () => {
  it("keeps Main Campus and gives the new principal no platform access", async () => {
    const main = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!main) throw new Error("MAIN campus missing");
    const studentsBefore = await prisma.student.count({ where: { campusId: main.id } });

    const token = await godToken();

    const listed = await json(await orgsGet(req("GET", "/api/v1/orgs", token)));
    expect(listed.status).toBe(200);
    const orgs = listed.body.data as OrgRow[];
    const listedMain = orgs.flatMap((org) => org.campuses).find((campus) => campus.id === main.id);
    expect(listedMain?.code).toBe("MAIN");
    expect(listedMain?.currentSessionId).toBe(main.currentSessionId);
    expect(listedMain?.academicYear).toBeTruthy();

    const mainAfterList = await prisma.campus.findUnique({ where: { id: main.id } });
    expect(mainAfterList?.currentSessionId).toBe(main.currentSessionId);
    expect(await prisma.student.count({ where: { campusId: main.id } })).toBe(studentsBefore);

    const code = `O${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const created = await json(
      await orgsPost(
        req("POST", "/api/v1/orgs", token, {
          name: `Org ${code}`,
          code,
        }),
      ),
    );
    expect(created.status).toBe(201);
    expect(created.body.code).toBe(code);
    expect(created.body.principalUsername).toBe("principal");
    expect(created.body.principalPassword).toMatch(/^Principal@[0-9a-f]{8}$/);
    const campus = created.body.campus as CampusRow;
    expect(campus.code).toBe(code);
    expect(campus.academicYear).toMatch(/^\d{4}-\d{2}$/);
    expect(campus.id).not.toBe(main.id);

    const mainAfterCreate = await prisma.campus.findUnique({ where: { id: main.id } });
    expect(mainAfterCreate?.id).toBe(main.id);
    expect(mainAfterCreate?.orgId).toBe(main.orgId);
    expect(mainAfterCreate?.currentSessionId).toBe(main.currentSessionId);
    expect(await prisma.student.count({ where: { campusId: main.id } })).toBe(studentsBefore);

    const again = await json(await orgsGet(req("GET", "/api/v1/orgs", token)));
    const againOrgs = again.body.data as OrgRow[];
    expect(againOrgs.some((org) => org.code === code)).toBe(true);
    expect(againOrgs.flatMap((org) => org.campuses).some((campus) => campus.id === main.id)).toBe(true);
    const passwords = (again.body.provisionedPrincipals ?? []) as Array<{ campusId: string }>;
    expect(passwords.some((row) => row.campusId === campus.id)).toBe(false);

    const principal = await login(
      "principal",
      "staff",
      String(created.body.principalPassword),
      code,
    );
    expect(principal.status).toBe(200);
    expect(principal.token).toBeTruthy();

    const deniedOrgs = await orgsGet(req("GET", "/api/v1/orgs", principal.token!));
    expect(deniedOrgs.status).toBe(403);
    const deniedSwitch = await switchPost(
      req("POST", "/api/v1/auth/switch-campus", principal.token!, { campusCode: "MAIN" }),
    );
    expect(deniedSwitch.status).toBe(403);
  }, 120000);
});
