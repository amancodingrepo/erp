import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createTaxSlab, listTaxSlabs } from "@/lib/services/payroll";

const bodySchema = z.object({
  kind: z.enum(["PT", "TDS"]),
  minAmount: z.union([z.number(), z.string()]),
  maxAmount: z.union([z.number(), z.string()]).optional().nullable(),
  rate: z.union([z.number(), z.string()]).optional(),
  taxAmount: z.union([z.number(), z.string()]).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const kind = new URL(request.url).searchParams.get("kind") ?? undefined;
    const rows = await listTaxSlabs(user.campusId, kind ?? undefined);
    return ok({
      data: rows.map((r) => ({
        ...r,
        minAmount: r.minAmount.toString(),
        maxAmount: r.maxAmount?.toString() ?? null,
        rate: r.rate?.toString() ?? null,
        taxAmount: r.taxAmount?.toString() ?? null,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const body = bodySchema.parse(await readJson(request));
    const row = await createTaxSlab(user.campusId, body);
    return created({
      ...row,
      minAmount: row.minAmount.toString(),
      maxAmount: row.maxAmount?.toString() ?? null,
    });
  } catch (error) {
    return fail(error);
  }
}
