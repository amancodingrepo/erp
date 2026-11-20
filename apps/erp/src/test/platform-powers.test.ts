import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GET as orgsGet, POST as orgsPost } from "@/app/api/v1/orgs/route";
import { PATCH as orgPatch } from "@/app/api/v1/orgs/[id]/route";
import { POST as campusPost } from "@/app/api/v1/orgs/[id]/campuses/route";
import { POST as archivePost } from "@/app/api/v1/orgs/[id]/archive/route";
import { PATCH as modulesPatch } from "@/app/api/v1/orgs/[id]/campuses/[campusId]/modules/route";
import { PATCH as maintenancePatch } from "@/app/api/v1/orgs/[id]/campuses/[campusId]/maintenance/route";
import { GET as backupGet } from "@/app/api/v1/orgs/[id]/backup/route";
import { POST as previewPost } from "@/app/api/v1/orgs/[id]/restore/preview/route";
import { GET as activityGet } from "@/app/api/v1/platform/activity/route";
import { POST as adminsPost } from "@/app/api/v1/platform/admins/route";
import { POST as retirePost } from "@/app/api/v1/platform/admins/[id]/retire/route";
import { POST as supportPost } from "@/app/api/v1/platform/support-login/route";
import { PATCH as templatePatch } from "@/app/api/v1/platform/templates/[id]/route";
import { GET as studentsGet } from "@/app/api/v1/platform/students/route";
import { POST as broadcastPost } from "@/app/api/v1/platform/broadcast/route";
import { POST as resetPost } from "@/app/api/v1/platform/accounts/[id]/reset-password/route";
import { prisma } from "@/lib/db";
import { assertOrgModule, schoolModulesForCampus } from "@/lib/org-modules";
import { assertCampusWritable } from "@/lib/principal";
import { signAuthToken } from "@/lib/auth-token";
import { loadPrincipal } from "@/lib/principal";
import { ensureTenantPolicies } from "@/lib/tenant-rls";
import { json, login, req } from "./acceptance/helpers";
import { godToken } from "./platform-god";

function suffix() {
  return randomBytes(3).toString("hex").toUpperCase();
}

describe("control center powers", () => {
  it("serialises row security setup", async () => {
    await Promise.all([ensureTenantPolicies(), ensureTenantPolicies(), ensureTenantPolicies()]);
  });

  it("renames, adds a campus, archives only an empty organisation, and previews a restore", async () => {
    const token = await godToken();
    const tag = suffix();
    const created = await json(await orgsPost(req("POST", "/api/v1/orgs", token, { name: "Powers " + tag, code: "PW" + tag })));
    expect(created.status).toBe(201);
    const orgId = String(created.body.id);
    const renamed = await json(await orgPatch(req("PATCH", "/api/v1/orgs/" + orgId, token, { name: "Powers Renamed " + tag, code: "PR" + tag }), { params: Promise.resolve({ id: orgId }) }));
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("Powers Renamed " + tag);

    const added = await json(await campusPost(req("POST", "/api/v1/orgs/" + orgId + "/campuses", token, { name: "Second " + tag, code: "PS" + tag }), { params: Promise.resolve({ id: orgId }) }));
    expect(added.status).toBe(201);
    const campusId = String((added.body.campus as { id: string }).id);

    const main = await prisma.campus.findFirst({ where: { code: "MAIN" }, select: { id: true, orgId: true } });
    if (!main) throw new Error("MAIN campus missing");
    const refused = await archivePost(req("POST", "/api/v1/orgs/" + main.orgId + "/archive", token, {}), { params: Promise.resolve({ id: main.orgId }) });
    expect(refused.status).toBe(409);

    const admission = "PWR" + tag;
    await prisma.student.create({ data: { campusId, admissionNo: admission, firstName: "Powers" } });
    const blocked = await archivePost(req("POST", "/api/v1/orgs/" + orgId + "/archive", token, {}), { params: Promise.resolve({ id: orgId }) });
    expect(blocked.status).toBe(409);
    const found = await json(await studentsGet(req("GET", "/api/v1/platform/students?q=" + admission, token)));
    expect(found.status).toBe(200);
    expect((found.body.data as Array<{ admissionNo: string }>).some((row) => row.admissionNo === admission)).toBe(true);
    await prisma.student.deleteMany({ where: { admissionNo: admission, campusId } });

    const archived = await json(await archivePost(req("POST", "/api/v1/orgs/" + orgId + "/archive", token, {}), { params: Promise.resolve({ id: orgId }) }));
    expect(archived.status).toBe(200);
    const hidden = await json(await orgsGet(req("GET", "/api/v1/orgs", token)));
    expect((hidden.body.data as Array<{ id: string }>).some((row) => row.id === orgId)).toBe(false);
    const shown = await json(await orgsGet(req("GET", "/api/v1/orgs?includeArchived=1", token)));
    expect((shown.body.data as Array<{ id: string }>).some((row) => row.id === orgId)).toBe(true);

    const backup = await json(await backupGet(req("GET", "/api/v1/orgs/" + orgId + "/backup", token), { params: Promise.resolve({ id: orgId }) }));
    expect(backup.status).toBe(200);
    const preview = await json(await previewPost(req("POST", "/api/v1/orgs/" + orgId + "/restore/preview", token, { fixture: backup.body }), { params: Promise.resolve({ id: orgId }) }));
    expect(preview.status).toBe(200);
    expect(preview.body.campuses).toBe(2);
    expect(preview.body.students).toBe(0);
  });

  it("turns one campus module off, blocks writes in maintenance, and ends a reset session", async () => {
    const token = await godToken();
    const tag = suffix();
    const created = await json(await orgsPost(req("POST", "/api/v1/orgs", token, { name: "Flags " + tag, code: "FL" + tag })));
    const orgId = String(created.body.id);
    const campusId = String((created.body.campus as { id: string }).id);
    const flags = await json(await modulesPatch(req("PATCH", "/api/v1/orgs/" + orgId + "/campuses/" + campusId + "/modules", token, { modules: { store: false } }), { params: Promise.resolve({ id: orgId, campusId }) }));
    expect(flags.status).toBe(200);
    expect((await schoolModulesForCampus(campusId)).store).toBe(false);
    await expect(assertOrgModule({ id: "x", campusId, actorType: "STAFF", roles: ["Principal"], permissions: [] }, "store")).rejects.toThrow(/off/);
    await assertOrgModule({ id: "god", campusId, actorType: "STAFF", roles: ["PlatformAdmin"], permissions: [] }, "store");
    await modulesPatch(req("PATCH", "/api/v1/orgs/" + orgId + "/campuses/" + campusId + "/modules", token, { modules: { store: true } }), { params: Promise.resolve({ id: orgId, campusId }) });

    const held = await json(await maintenancePatch(req("PATCH", "/api/v1/orgs/" + orgId + "/campuses/" + campusId + "/maintenance", token, { readOnly: true }), { params: Promise.resolve({ id: orgId, campusId }) }));
    expect(held.status).toBe(200);
    await expect(assertCampusWritable({ id: "x", campusId, actorType: "STAFF", roles: ["Principal"], permissions: [] }, "edit")).rejects.toThrow(/maintenance/);
    await assertCampusWritable({ id: "god", campusId, actorType: "STAFF", roles: ["PlatformAdmin"], permissions: [] }, "edit");
    await maintenancePatch(req("PATCH", "/api/v1/orgs/" + orgId + "/campuses/" + campusId + "/maintenance", token, { readOnly: false }), { params: Promise.resolve({ id: orgId, campusId }) });

    const username = "god" + tag.toLowerCase();
    const invited = await json(await adminsPost(req("POST", "/api/v1/platform/admins", token, { username })));
    expect(invited.status).toBe(201);
    const session = await login(username, "staff", String(invited.body.temporaryPassword), "MAIN");
    expect(session.token).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const reset = await json(await resetPost(req("POST", "/api/v1/platform/accounts/" + invited.body.id + "/reset-password", token, {}), { params: Promise.resolve({ id: String(invited.body.id) }) }));
    expect(reset.status).toBe(200);
    const stale = await orgsGet(req("GET", "/api/v1/orgs", session.token || ""));
    expect(stale.status).toBe(401);
    const retired = await retirePost(req("POST", "/api/v1/platform/admins/" + invited.body.id + "/retire", token, {}), { params: Promise.resolve({ id: String(invited.body.id) }) });
    expect(retired.status).toBe(200);

    const support = await json(await supportPost(req("POST", "/api/v1/platform/support-login", token, { campusId })));
    expect(support.status).toBe(200);
    expect(Number(support.body.supportUntil)).toBeGreaterThan(Date.now());
    const principal = await loadPrincipal(String((support.body.user as { id: string }).id), campusId);
    principal.supportUntil = Date.now() - 1000;
    const expired = await signAuthToken(principal);
    const denied = await orgsGet(req("GET", "/api/v1/orgs", expired));
    expect(denied.status).toBe(401);

    const template = await prisma.printTemplate.create({ data: { campusId, kind: "test", name: "Powers " + tag, body: "old" } });
    const saved = await json(await templatePatch(req("PATCH", "/api/v1/platform/templates/" + template.id, token, { body: "new body" }), { params: Promise.resolve({ id: template.id }) }));
    expect(saved.status).toBe(200);
    expect(saved.body.body).toBe("new body");
    await prisma.printTemplate.delete({ where: { id: template.id } });

    const activity = await json(await activityGet(req("GET", "/api/v1/platform/activity?q=support&orgId=" + orgId, token)));
    expect(activity.status).toBe(200);
    expect((activity.body.data as Array<{ action: string }>).some((row) => row.action === "support")).toBe(true);
    const csv = await activityGet(req("GET", "/api/v1/platform/activity?format=csv&q=support", token));
    expect(csv.headers.get("content-type")).toContain("text/csv");
    expect(await csv.text()).toContain("support");

    const title = "Powers note " + tag;
    const sent = await json(await broadcastPost(req("POST", "/api/v1/platform/broadcast", token, { title, body: "Hello principals" })));
    expect(sent.status).toBe(201);
    expect(Number(sent.body.campuses)).toBeGreaterThan(0);
    await prisma.notice.deleteMany({ where: { title } });
  });
});
