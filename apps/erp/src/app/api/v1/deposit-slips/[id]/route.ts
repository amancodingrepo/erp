import { NextResponse } from "next/server";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseDepositSlipPatch } from "@/lib/services/campus-spec-aliases";
import {
  getDepositSlip,
  getDepositSlipPdf,
  removeDepositSlip,
  updateDepositSlip,
} from "@/lib/services/fees-deposit";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const { id } = await context.params;
    const format = new URL(request.url).searchParams.get("format");
    if (format === "pdf") {
      const result = await getDepositSlipPdf(user.campusId, id);
      return new NextResponse(Buffer.from(result.pdf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="${result.slip.slipNo}.pdf"`,
        },
      });
    }
    return ok(await getDepositSlip(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const { id } = await context.params;
    const body = parseDepositSlipPatch(await readJson(request));
    return ok(await updateDepositSlip(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const { id } = await context.params;
    return ok({ data: await removeDepositSlip(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}
