export function isExamFormWindowOpen(
  opensAt: Date,
  closesAt: Date,
  now: Date = new Date(),
) {
  const t = now.getTime();
  return t >= opensAt.getTime() && t <= closesAt.getTime();
}
