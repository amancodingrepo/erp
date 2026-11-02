import { randomBytes } from "crypto";
import { z } from "zod";
import { requestIp, writeAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  assertPlatformAdmin,
  attachBranchExtras,
  homeCampusForUser,
  listBranches,
  provisionCampusTenant,
} from "@/lib/services/tenants";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";

const createSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  orgId: z.string().optional(),
  adminUsername: z.string().min(1).optional(),
  adminPassword: z.string().min(8).optional(),
  demoUsers: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "tenants",
      "campus",
      "view",
    );
    assertPlatformAdmin(user);
    const home = await homeCampusForUser(user.id);
    return ok({
      activeCampusId: user.campusId,
      homeCampusId: home.id,
      data: await listBranches(home.orgId),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "tenants",
      "campus",
      "create",
    );
    assertPlatformAdmin(user);
    const body = createSchema.parse(await readJson(request));
    const home = await homeCampusForUser(user.id);
    const orgId = body.orgId ?? home.orgId;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw notFound("org");
    const generated =
      body.adminPassword ?? `Campus@${randomBytes(4).toString("hex")}`;
    const { campus, adminUsername } = await provisionCampusTenant({
      orgId: org.id,
      name: body.name,
      code: body.code,
      adminUsername: body.adminUsername ?? "admin",
      adminPasswordHash: await hashPassword(generated),
      demoUsers: Boolean(body.demoUsers),
    });
    await writeAudit({
      userId: user.id,
      campusId: home.id,
      action: "create",
      entity: "campus",
      entityId: campus.id,
      after: { code: campus.code, name: campus.name },
      ip: requestIp(request),
    });
    const branch = await attachBranchExtras(campus);
    return created({
      ...branch,
      adminUsername,
      adminPassword: generated,
    });
  } catch (error) {
    return fail(error);
  }
}
