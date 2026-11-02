import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { principalFromRequest } from "@/lib/principal";
import { defaultReceiptSettings } from "@/lib/school-world-fees";

export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    const assignment = await prisma.schoolTemplateAssignment.findFirst({
      where: { userId: user.id, templateType: "fee_receipt" },
      include: { template: { include: { receiptSettings: { include: { notes: true } } } } },
    });
    const settings = assignment?.template.receiptSettings;
    if (!settings) return ok({ feeReceipt: null });
    return ok({
      feeReceipt: {
        id: assignment.templateId,
        receiptSettings: { ...defaultReceiptSettings, ...settings },
        receiptNotes: settings.notes,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
