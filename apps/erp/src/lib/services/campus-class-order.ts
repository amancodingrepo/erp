import { prisma } from "@/lib/db";
import { validationError } from "@/lib/errors";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

export function applyClassOrder(
  liveIds: string[],
  orderedIds: unknown,
): Array<{ id: string; sequenceNo: number }> {
  const live = liveIds.map((id) => trim(id)).filter(Boolean);
  const liveSet = new Set(live);
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw validationError({ classIds: "required" });
  }
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const raw of orderedIds) {
    const id = trim(raw);
    if (!id) continue;
    if (!liveSet.has(id)) throw validationError({ classIds: "unknown" });
    if (seen.has(id)) throw validationError({ classIds: "duplicate" });
    seen.add(id);
    ordered.push(id);
  }
  if (!ordered.length) throw validationError({ classIds: "required" });
  const rest = live.filter((id) => !seen.has(id));
  return [...ordered, ...rest].map((id, sequenceNo) => ({ id, sequenceNo }));
}

export async function saveClassOrder(campusId: string, classIds: unknown) {
  const live = await prisma.class.findMany({
    where: { program: { department: { campusId } } },
    select: { id: true },
    orderBy: { sequenceNo: "asc" },
  });
  const next = applyClassOrder(
    live.map((row) => row.id),
    classIds,
  );
  await prisma.$transaction(
    next.map((row) =>
      prisma.class.update({
        where: { id: row.id },
        data: { sequenceNo: row.sequenceNo },
      }),
    ),
  );
  return next;
}
