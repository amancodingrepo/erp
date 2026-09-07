export function lateDays(dueOn: Date, returnedAt: Date) {
  const due = Date.UTC(dueOn.getUTCFullYear(), dueOn.getUTCMonth(), dueOn.getUTCDate());
  const ret = Date.UTC(
    returnedAt.getUTCFullYear(),
    returnedAt.getUTCMonth(),
    returnedAt.getUTCDate(),
  );
  return Math.max(0, Math.floor((ret - due) / 86400000));
}

export function libraryFine(dueOn: Date, returnedAt: Date, perDay: number) {
  return lateDays(dueOn, returnedAt) * perDay;
}
