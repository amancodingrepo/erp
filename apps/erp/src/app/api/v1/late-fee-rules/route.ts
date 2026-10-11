import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachLateFeeRules,
  parseLateFeeRule,
} from "@/lib/services/campus-spec-aliases";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const data = await prisma.fineRule.findMany({
      where: { campusId: user.campusId },
      orderBy: { afterDays: "asc" },
    });
    return ok({ data: attachLateFeeRules(data) });
  } catch (error) {
    return fail(error);
  }
}

async function upsertRule(request: Request) {
  const user = await requireApiPermission(request, "fees", "master", "create");
  const body = parseLateFeeRule(await readJson(request));
  const row = await prisma.fineRule.create({
    data: {
      campusId: user.campusId,
      name: body.name,
      afterDays: body.afterDays,
      kind: body.kind,
      value: body.value,
    },
  });
  return created(attachLateFeeRules([row])[0]);
}

export async function POST(request: Request) {
  try {
    return await upsertRule(request);
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    return await upsertRule(request);
  } catch (error) {
    return fail(error);
  }
}
