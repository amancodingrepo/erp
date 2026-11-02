import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachFeeTypeExtras,
  listFeeTypeExtras,
  saveFeeTypeExtra,
} from "@/lib/services/campus-fee-type-extras";

const extraSchema = {
  isRefundable: z.boolean().optional(),
  cgst: z.boolean().optional(),
  sgst: z.boolean().optional(),
  igst: z.boolean().optional(),
  visible: z.boolean().optional(),
};

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  ...extraSchema,
});

function extraPatch(body: z.infer<typeof createSchema>) {
  const patch: {
    isRefundable?: boolean;
    cgst?: boolean;
    sgst?: boolean;
    igst?: boolean;
    visible?: boolean;
  } = {};
  if (body.isRefundable !== undefined) patch.isRefundable = body.isRefundable;
  if (body.cgst !== undefined) patch.cgst = body.cgst;
  if (body.sgst !== undefined) patch.sgst = body.sgst;
  if (body.igst !== undefined) patch.igst = body.igst;
  if (body.visible !== undefined) patch.visible = body.visible;
  return Object.keys(patch).length ? patch : null;
}

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const [data, extras] = await Promise.all([
      prisma.feeType.findMany({
        where: { campusId: user.campusId },
        orderBy: { name: "asc" },
      }),
      listFeeTypeExtras(user.campusId),
    ]);
    return ok({ data: attachFeeTypeExtras(data, extras) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "create");
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.feeType.create({
      data: { campusId: user.campusId, name: body.name, code: body.code },
    });
    const patch = extraPatch(body);
    if (patch) await saveFeeTypeExtra(user.campusId, row.id, patch);
    const extras = await listFeeTypeExtras(user.campusId);
    return created(attachFeeTypeExtras([row], extras)[0]);
  } catch (error) {
    return fail(error);
  }
}
