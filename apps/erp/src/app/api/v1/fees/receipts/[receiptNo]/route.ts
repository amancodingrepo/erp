import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { getReceipt } from "@/lib/services/fees";

export async function GET(
  request: Request,
  context: { params: Promise<{ receiptNo: string }> },
) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "view");
    const { receiptNo } = await context.params;
    const format = new URL(request.url).searchParams.get("format");
    const receipt = await getReceipt({
      campusId: user.campusId,
      receiptNo: decodeURIComponent(receiptNo),
    });
    if (format === "pdf") {
      return new NextResponse(Buffer.from(receipt.pdf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="${receipt.view.receiptNo}.pdf"`,
        },
      });
    }
    return ok(receipt.json);
  } catch (error) {
    return fail(error);
  }
}
