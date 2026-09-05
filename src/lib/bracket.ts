// Pure bracket-sizing / random-bracket-generation / progression logic.
// No I/O in this file at all — everything here is unit-testable without a
// database, which is exactly what src/lib/__tests__/bracket.test.ts exercises.

import { BRACKET_SIZES, ROUND_ORDER } from "@/lib/constants";
import type { Round } from "@/lib/types";

export type RandomFn = () => number;

/**
 * Largest suitable power-of-two bracket size for a given number of eligible
 * entries, per the product spec:
 *   64+ -> 64, 32-63 -> 32, 16-31 -> 16, 8-15 -> 8, 4-7 -> 4, 2-3 -> 2, <2 -> 0
 */
export function bracketSizeFor(eligibleCount: number): number {
  if (eligibleCount < 2) return 0;
  for (const size of BRACKET_SIZES) {
    if (eligibleCount >= size) return size;
  }
  return 0;
}

/** Which round a freshly-generated bracket of this size kicks off in. */
export function firstRoundForSize(size: number): Round {
  switch (size) {
    case 64:
      return "ROUND_64";
    case 32:
      return "ROUND_32";
    case 16:
      return "ROUND_16";
    case 8:
      return "QUARTERFINAL";
    case 4:
      return "SEMIFINAL";
    case 2:
      return "FINAL";
    default:
      throw new Error(`Not a valid bracket size: ${size}`);
  }
}

/** Full ordered list of rounds this bracket size will play through, ending in FINAL. */
export function roundPathForSize(size: number): Round[] {
  const first = firstRoundForSize(size);
  const idx = ROUND_ORDER.indexOf(first);
  return ROUND_ORDER.slice(idx);
}

/** The round after `current` for a bracket of this size, or null if `current` was the FINAL. */
export function nextRoundInPath(current: Round, size: number): Round | null {
  const path = roundPathForSize(size);
  const idx = path.indexOf(current);
  if (idx === -1) throw new Error(`Round ${current} is not on the path for size ${size}`);
  return path[idx + 1] ?? null;
}

/** Fisher-Yates shuffle. Takes an injectable RNG so tests can be deterministic. */
export function shuffle<T>(items: T[], random: RandomFn = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * From a pool of eligible entry ids, decide the bracket size and randomly
 * pick+order the entries that make it in. If the pool is smaller than the
 * chosen size (impossible given bracketSizeFor, but defensive), it is
 * returned as-is. Returns entries in seed order (index 0 = seed 1, etc).
 */
export function selectEligibleForBracket<T>(
  pool: T[],
  random: RandomFn = Math.random
): { size: number; selected: T[] } {
  const size = bracketSizeFor(pool.length);
  if (size === 0) return { size: 0, selected: [] };
  const shuffled = shuffle(pool, random);
  return { size, selected: shuffled.slice(0, size) };
}

export interface GeneratedMatchup<T> {
  position: number;
  round: Round;
  a: T;
  b: T;
}

/**
 * Pair up a seed-ordered list of entries into the first round's matchups.
 * Seed order was already randomised by selectEligibleForBracket, so this is
 * simple adjacent pairing (seed 1 v seed 2, seed 3 v seed 4, ...).
 */
export function pairFirstRound<T>(seeded: T[]): GeneratedMatchup<T>[] {
  if (seeded.length % 2 !== 0) {
    throw new Error("Bracket size must be even to pair matchups");
  }
  const round = firstRoundForSize(seeded.length);
  const out: GeneratedMatchup<T>[] = [];
  for (let i = 0; i < seeded.length; i += 2) {
    out.push({ position: i / 2, round, a: seeded[i], b: seeded[i + 1] });
  }
  return out;
}

/**
 * Given the winners of the current round in position order (index = position
 * in that round), produce the pairings for the next round. Winner of
 * position 0 plays winner of position 1, winner of 2 plays winner of 3, etc.
 */
export function pairNextRound<T>(
  winnersInPositionOrder: T[],
  nextRound: Round
): GeneratedMatchup<T>[] {
  if (winnersInPositionOrder.length % 2 !== 0) {
    throw new Error("Number of winners must be even to pair the next round");
  }
  const out: GeneratedMatchup<T>[] = [];
  for (let i = 0; i < winnersInPositionOrder.length; i += 2) {
    out.push({
      position: i / 2,
      round: nextRound,
      a: winnersInPositionOrder[i],
      b: winnersInPositionOrder[i + 1],
    });
  }
  return out;
}
