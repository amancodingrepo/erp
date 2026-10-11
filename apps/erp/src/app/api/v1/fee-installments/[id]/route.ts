import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  getFeeInstallment,
  removeFeeInstallment,
  saveFeeInstallment,
} from "@/lib/services/campus-fee-installments";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const { id } = await context.params;
    return ok(await getFeeInstallment(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const { id } = await context.params;
    await getFeeInstallment(user.campusId, id);
    const body = (await readJson(request)) as { name?: unknown };
    const name = String(body?.name ?? "").trim();
    return ok(await saveFeeInstallment(user.campusId, { id, name }));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const { id } = await context.params;
    return ok({ data: await removeFeeInstallment(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
