export function averageRating(values: number[]) {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, n) => sum + n, 0) / values.length) * 10) / 10;
}

export function countByOption(values: string[]) {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export function parseRating(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}
