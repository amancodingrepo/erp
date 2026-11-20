import { describe, expect, it } from "vitest";
import { POST as fullRestore } from "@/app/api/v1/backup/restore/route";
import { prisma } from "@/lib/db";
import { exportOrg, restoreOrg } from "@/lib/org-backup";
import { clearTenant } from "@/lib/tenant-context";
import { login, req } from "@/test/acceptance/helpers";

async function school(code: string, name: string) {
  const org = await prisma.organization.create({ data: { name, code } });
  const campus = await prisma.campus.create({
    data: {
      orgId: org.id,
      name,
      code,
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      currencyCode: "INR",
    },
  });
  const student = await prisma.student.create({
    data: { campusId: campus.id, admissionNo: `${code}-1`, firstName: name },
  });
  return { org, campus, student };
}

describe("organisation backup", () => {
  it("restores one organisation without deleting the other organisation's students", async () => {
    clearTenant();
    const stamp = Date.now().toString(36).slice(-6).toUpperCase();
    const schoolA = await school(`R6A${stamp}`, `Backup A ${stamp}`);
    const schoolB = await school(`R6B${stamp}`, `Backup B ${stamp}`);
    const fixture = await exportOrg(schoolA.org.id);
    expect(fixture.students.map((student) => student.id)).toEqual([schoolA.student.id]);

    const extra = await prisma.student.create({
      data: {
        campusId: schoolA.campus.id,
        admissionNo: `${schoolA.campus.code}-2`,
        firstName: "Extra",
      },
    });
    await prisma.student.update({
      where: { id: schoolB.student.id },
      data: { firstName: "Kept" },
    });

    const restored = await restoreOrg(fixture);
    expect(restored.students).toBe(1);
    expect(await prisma.student.findUnique({ where: { id: extra.id } })).toBeNull();
    expect((await prisma.student.findUnique({ where: { id: schoolA.student.id } }))?.firstName).toBe(`Backup A ${stamp}`);

    const kept = await prisma.student.findUnique({ where: { id: schoolB.student.id } });
    expect(kept?.firstName).toBe("Kept");
    expect(kept?.campusId).toBe(schoolB.campus.id);

    const stolen = {
      ...fixture,
      campuses: [
        ...fixture.campuses,
        {
          id: schoolB.campus.id,
          name: "Stolen",
          code: `NO${stamp}`,
          timezone: "Asia/Kolkata",
          dateFormat: "DD/MM/YYYY",
          currencyCode: "INR",
          currentSessionId: null,
        },
      ],
    };
    await expect(restoreOrg(stolen)).rejects.toThrow(/another organisation/);
    expect((await prisma.student.findUnique({ where: { id: schoolB.student.id } }))?.firstName).toBe("Kept");
    clearTenant();
  });

  it("requires the platform god and a typed confirmation for a whole-database restore", async () => {
    const admin = await login("admin", "staff");
    expect(admin.token).toBeTruthy();
    const denied = await fullRestore(req("POST", "/api/v1/backup/restore", admin.token!, {
      name: "erp-missing.dump",
      confirm: "RESTORE ALL CAMPUSES",
    }));
    expect(denied.status).toBe(403);

    const god = await login("platform-check", "staff", undefined, "MAIN");
    expect(god.token).toBeTruthy();
    const unconfirmed = await fullRestore(req("POST", "/api/v1/backup/restore", god.token!, {
      name: "erp-missing.dump",
      confirm: "yes",
    }));
    expect(unconfirmed.status).toBe(422);
    clearTenant();
  });
});
