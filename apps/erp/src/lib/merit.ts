export type MeritApplicant = {
  id: string;
  score: number | null;
  categoryCode: string | null;
  programId: string | null;
};

export type CutoffInput = {
  programId: string;
  roundNo: number;
  categoryCode: string;
  minScore: number;
};

export function cutoffFor(
  cutoffs: CutoffInput[],
  programId: string,
  roundNo: number,
  categoryCode: string | null,
) {
  const cat = (categoryCode ?? "GENERAL").trim().toUpperCase() || "GENERAL";
  return (
    cutoffs.find(
      (c) =>
        c.programId === programId &&
        c.roundNo === roundNo &&
        c.categoryCode.toUpperCase() === cat,
    ) ??
    cutoffs.find(
      (c) =>
        c.programId === programId &&
        c.roundNo === roundNo &&
        c.categoryCode.toUpperCase() === "GENERAL",
    )
  );
}

/** Rank eligible applicants by score descending. Below-cutoff rows are rejected. */
export function buildMeritRanks(
  applicants: MeritApplicant[],
  cutoffs: CutoffInput[],
  roundNo: number,
  programId: string,
) {
  const pool = applicants.filter((a) => a.programId === programId);
  const eligible: MeritApplicant[] = [];
  const rejected: string[] = [];
  for (const row of pool) {
    const cut = cutoffFor(cutoffs, programId, roundNo, row.categoryCode);
    const score = row.score == null ? NaN : Number(row.score);
    if (!cut || !Number.isFinite(score) || score < cut.minScore) {
      rejected.push(row.id);
    } else {
      eligible.push(row);
    }
  }
  eligible.sort((a, b) => {
    const diff = Number(b.score) - Number(a.score);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
  return {
    ranked: eligible.map((row, index) => ({ id: row.id, rank: index + 1 })),
    rejected,
  };
}
