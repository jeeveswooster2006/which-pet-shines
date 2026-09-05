// Vote tallying, percentage display, and tie / sudden-death / tie-break logic.
// Pure functions — no DB access — see src/lib/__tests__/scoring.test.ts.

import type { RandomFn } from "@/lib/bracket";

export interface VoteTally {
  petAVotes: number;
  petBVotes: number;
}

export interface MatchupResult {
  petAVotes: number;
  petBVotes: number;
  totalVotes: number;
  petAPercent: number;
  petBPercent: number;
  isTie: boolean;
}

/**
 * Percentages are rounded to whole numbers for the "Bella — 63% — 1,248
 * votes" display. When there are no votes yet both sides show 0%. When the
 * rounded values wouldn't add to 100 (e.g. 33/33/33 leftover), the extra
 * point is given to whichever side has more raw votes, so the two shown
 * numbers always sum to 100 for a non-empty matchup.
 */
export function computeMatchupResult(tally: VoteTally): MatchupResult {
  const { petAVotes, petBVotes } = tally;
  const totalVotes = petAVotes + petBVotes;

  if (totalVotes === 0) {
    return {
      petAVotes: 0,
      petBVotes: 0,
      totalVotes: 0,
      petAPercent: 0,
      petBPercent: 0,
      isTie: false,
    };
  }

  const petAPercent = Math.round((petAVotes / totalVotes) * 100);
  const petBPercent = 100 - petAPercent;

  return {
    petAVotes,
    petBVotes,
    totalVotes,
    petAPercent,
    petBPercent,
    isTie: petAVotes === petBVotes,
  };
}

export type TieBreakMethod = "RANDOM_TIE_BREAK";

export interface TieBreakResult {
  winner: "A" | "B";
  method: TieBreakMethod;
}

/**
 * Deterministic-but-random fallback used only when a matchup is still tied
 * after its one-hour sudden-death window. Takes an injectable RNG so the
 * outcome is reproducible in tests.
 */
export function resolveTieBreak(random: RandomFn = Math.random): TieBreakResult {
  return { winner: random() < 0.5 ? "A" : "B", method: "RANDOM_TIE_BREAK" };
}
