export const MAPPING_WEIGHTS = [0, 1, 2, 3] as const;

export function isMappingWeight(value: number) {
  return MAPPING_WEIGHTS.includes(value as (typeof MAPPING_WEIGHTS)[number]);
}

export function directAttainmentPercent(
  rows: Array<{ marks: number | null; isAbsent: boolean; minMarks: number }>,
) {
  const appeared = rows.filter((r) => !r.isAbsent && r.marks !== null);
  if (!appeared.length) return 0;
  const met = appeared.filter((r) => (r.marks as number) >= r.minMarks).length;
  return Math.round((met / appeared.length) * 100);
}

export function averagePercents(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
}

export function weightedPoDirect(
  links: Array<{ coPercent: number; weight: number }>,
) {
  const active = links.filter((l) => l.weight > 0);
  const sumW = active.reduce((sum, l) => sum + l.weight, 0);
  if (!sumW) return 0;
  return Math.round(
    active.reduce((sum, l) => sum + l.coPercent * l.weight, 0) / sumW,
  );
}

export function overallPo(
  direct: number,
  indirect: number | null,
  directShare = 0.8,
) {
  if (indirect === null) return direct;
  return Math.round(direct * directShare + indirect * (1 - directShare));
}
