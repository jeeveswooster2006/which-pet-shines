// Pet of the Month: the pet with the highest TOTAL votes across all of its
// matchups within a calendar month — not the weekly champion. A pet that
// never won a single matchup can still take Pet of the Month on raw vote
// volume, and a pet that won every matchup that month can still lose it.

export interface PetMonthlyVotes {
  petId: string;
  totalVotes: number;
  /** Tiebreak only: earlier submissions win a dead-even tie, so the result is deterministic. */
  petCreatedAt: Date;
}

export interface MonthlyWinner {
  petId: string;
  totalVotes: number;
}

export function computeMonthlyWinner(
  tallies: PetMonthlyVotes[]
): MonthlyWinner | null {
  if (tallies.length === 0) return null;

  const sorted = [...tallies].sort((a, b) => {
    if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
    return a.petCreatedAt.getTime() - b.petCreatedAt.getTime();
  });

  const top = sorted[0];
  return { petId: top.petId, totalVotes: top.totalVotes };
}
