import { describe, expect, it } from "vitest";
import { GET as campusesGet } from "@/app/api/v1/public/campuses/route";
import { GET as applyGet } from "@/app/api/v1/public/apply/route";
import { POST as applyPost } from "@/app/api/v1/public/applications/route";
import { GET as studentsGet } from "@/app/api/v1/students/route";
import { GET as tenantsGet } from "@/app/api/v1/tenants/route";
import { POST as tenantsPost } from "@/app/api/v1/tenants/route";
import { POST as switchPost } from "@/app/api/v1/auth/switch-campus/route";
import { prisma } from "@/lib/db";
import { login, req, json, SEED_PASSWORD } from "./acceptance/helpers";

describe("multi-tenant campuses", () => {
  it("lists public campus codes", async () => {
    const res = await campusesGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ code: string; name: string }>;
    };
    const codes = body.data.map((c) => c.code);
    expect(codes).toContain("MAIN");
    expect(codes).toContain("EAST");
  });

  it("scopes login to campus so MAIN admin does not see EAST students", async () => {
    const main = await login("admin", "staff");
    const east = await login("admin", "staff", SEED_PASSWORD, "EAST");
    expect(main.token).toBeTruthy();
    expect(east.token).toBeTruthy();

    const eastCampus = await prisma.campus.findFirst({ where: { code: "EAST" } });
    if (!eastCampus) throw new Error("EAST campus missing from seed");
    expect(
      (east.body as { user?: { campusId: string } }).user?.campusId,
    ).toBe(eastCampus.id);

    const mainStudents = await json(
      await studentsGet(req("GET", "/api/v1/students?pageSize=100", main.token!)),
    );
    const eastStudents = await json(
      await studentsGet(req("GET", "/api/v1/students?pageSize=100", east.token!)),
    );
    expect(mainStudents.status).toBe(200);
    expect(eastStudents.status).toBe(200);
    const mainIds = new Set(
      ((mainStudents.body.data as Array<{ id: string }>) ?? []).map((s) => s.id),
    );
    const eastIds = (
      (eastStudents.body.data as Array<{ id: string }>) ?? []
    ).map((s) => s.id);
    expect(eastIds.some((id) => mainIds.has(id))).toBe(false);
  });

  it("public apply can target EAST", async () => {
    const catalog = await applyGet(
      new Request("http://local/api/v1/public/apply?campus=EAST"),
    );
    expect(catalog.status).toBe(200);
    const cat = (await catalog.json()) as { campus: { code?: string } };
    expect(cat.campus.code).toBe("EAST");

    const eastProgram = await prisma.program.findFirst({
      where: { department: { campus: { code: "EAST" } } },
    });
    const created = await applyPost(
      new Request("http://local/api/v1/public/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: "East",
          lastName: "Applicant",
          fatherName: "East Parent",
          mobile: "9000000011",
          email: "east.applicant@example.com",
          dob: "2011-04-01",
          gender: "MALE",
          programId: eastProgram?.id,
          previousQualification: "Class 8",
          score: 72,
          campusCode: "EAST",
        }),
      }),
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as { id: string };
    const row = await prisma.application.findUnique({ where: { id: body.id } });
    const east = await prisma.campus.findFirst({ where: { code: "EAST" } });
    expect(row?.campusId).toBe(east?.id);
  });

  it("teacher cannot list tenants; PlatformAdmin can switch campus", async () => {
    const teacher = await login("teacher", "staff");
    const denied = await tenantsGet(
      req("GET", "/api/v1/tenants", teacher.token!),
    );
    expect(denied.status).toBe(403);

    const admin = await login("admin", "staff");
    const list = await json(
      await tenantsGet(req("GET", "/api/v1/tenants", admin.token!)),
    );
    expect(list.status).toBe(200);
    const rows = list.body.data as Array<{ id: string; code: string }>;
    const east = rows.find((r) => r.code === "EAST");
    expect(east).toBeTruthy();

    const switched = await json(
      await switchPost(
        req("POST", "/api/v1/auth/switch-campus", admin.token!, {
          campusCode: "EAST",
        }),
      ),
    );
    expect(switched.status).toBe(200);
    expect((switched.body.campus as { code: string }).code).toBe("EAST");
  });

  it("PlatformAdmin can create a campus", async () => {
    const admin = await login("admin", "staff");
    const code = `T${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const created = await json(
      await tenantsPost(
        req("POST", "/api/v1/tenants", admin.token!, {
          name: `Test ${code}`,
          code,
        }),
      ),
    );
    expect(created.status).toBe(201);
    expect(created.body.code).toBe(code);
    expect(created.body.adminPassword).toBeTruthy();
  });
});
