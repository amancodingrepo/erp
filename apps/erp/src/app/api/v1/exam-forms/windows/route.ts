import { ExamFormKind } from "@prisma/client";
import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  createExamFormWindow,
  listExamFormWindows,
} from "@/lib/services/exam-forms";

const bodySchema = z.object({
  kind: z.nativeEnum(ExamFormKind),
  examGroupId: z.string().min(1),
  opensAt: z.string().min(1),
  closesAt: z.string().min(1),
  feeAmount: z.union([z.number(), z.string()]),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    const kind = new URL(request.url).searchParams.get("kind");
    const parsed =
      kind === "ATKT" || kind === "REVAL" ? (kind as ExamFormKind) : undefined;
    const rows = await listExamFormWindows(user.campusId, parsed);
    return ok({
      data: rows.map((w) => ({
        ...w,
        feeAmount: w.feeAmount.toString(),
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "create");
    const body = bodySchema.parse(await readJson(request));
    const row = await createExamFormWindow(user.campusId, body);
    return created({ ...row, feeAmount: row.feeAmount.toString() });
  } catch (error) {
    return fail(error);
  }
}
