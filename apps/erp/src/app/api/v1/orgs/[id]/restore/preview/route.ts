import { z } from "zod";
import { forbidden } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { orgFixtureSchema, previewOrgFixture } from "@/lib/org-backup";
import { requireApiPermission } from "@/lib/principal";
import { assertPlatformAdmin } from "@/lib/services/tenants";

const bodySchema = z.object({ fixture: orgFixtureSchema });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission(request, "settings", "backup", "edit");
    assertPlatformAdmin(user);
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    if (body.fixture.organization.id !== id) throw forbidden("fixture organisation does not match");
    return ok(previewOrgFixture(body.fixture));
  } catch (error) { return fail(error); }
}
