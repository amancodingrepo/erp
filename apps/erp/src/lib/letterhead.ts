import { prisma } from "@/lib/db";

export async function campusLetterhead(campusId: string) {
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  const rows = await prisma.setting.findMany({
    where: {
      campusId,
      key: { in: ["campus.printHeader", "campus.printFooter", "campus.logo"] },
    },
  });
  const extra: Record<string, string> = {};
  for (const row of rows) {
    extra[row.key.replace(/^campus\./, "")] = String(row.value ?? "");
  }
  return {
    campusName: campus?.name ?? "Campus",
    header: extra.printHeader || campus?.name || "Campus",
    footer: extra.printFooter || campus?.address || "",
    logo: extra.logo || "",
  };
}
