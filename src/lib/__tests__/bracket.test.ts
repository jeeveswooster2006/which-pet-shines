import { describe, it, expect } from "vitest";
import {
  bracketSizeFor,
  firstRoundForSize,
  roundPathForSize,
  nextRoundInPath,
  selectEligibleForBracket,
  pairFirstRound,
  pairNextRound,
  shuffle,
} from "@/lib/bracket";
import { mulberry32 } from "./rng";

describe("bracketSizeFor", () => {
  it("picks the largest suitable power-of-two size per the spec table", () => {
    expect(bracketSizeFor(0)).toBe(0);
    expect(bracketSizeFor(1)).toBe(0);
    expect(bracketSizeFor(2)).toBe(2);
    expect(bracketSizeFor(3)).toBe(2);
    expect(bracketSizeFor(4)).toBe(4);
    expect(bracketSizeFor(7)).toBe(4);
    expect(bracketSizeFor(8)).toBe(8);
    expect(bracketSizeFor(15)).toBe(8);
    expect(bracketSizeFor(16)).toBe(16);
    expect(bracketSizeFor(31)).toBe(16);
    expect(bracketSizeFor(32)).toBe(32);
    expect(bracketSizeFor(63)).toBe(32);
    expect(bracketSizeFor(64)).toBe(64);
    expect(bracketSizeFor(200)).toBe(64);
  });
});

describe("firstRoundForSize / roundPathForSize / nextRoundInPath", () => {
  it("maps bracket size to the correct opening round", () => {
    expect(firstRoundForSize(64)).toBe("ROUND_64");
    expect(firstRoundForSize(32)).toBe("ROUND_32");
    expect(firstRoundForSize(16)).toBe("ROUND_16");
    expect(firstRoundForSize(8)).toBe("QUARTERFINAL");
    expect(firstRoundForSize(4)).toBe("SEMIFINAL");
    expect(firstRoundForSize(2)).toBe("FINAL");
  });

  it("builds a full path ending in FINAL for every size", () => {
    expect(roundPathForSize(8)).toEqual(["QUARTERFINAL", "SEMIFINAL", "FINAL"]);
    expect(roundPathForSize(64)).toEqual([
      "ROUND_64",
      "ROUND_32",
      "ROUND_16",
      "QUARTERFINAL",
      "SEMIFINAL",
      "FINAL",
    ]);
  });

  it("advances one round at a time and returns null after FINAL", () => {
    expect(nextRoundInPath("QUARTERFINAL", 8)).toBe("SEMIFINAL");
    expect(nextRoundInPath("SEMIFINAL", 8)).toBe("FINAL");
    expect(nextRoundInPath("FINAL", 8)).toBeNull();
    expect(nextRoundInPath("ROUND_64", 64)).toBe("ROUND_32");
  });

  it("a 2-pet bracket goes straight to FINAL with no other rounds", () => {
    expect(roundPathForSize(2)).toEqual(["FINAL"]);
    expect(nextRoundInPath("FINAL", 2)).toBeNull();
  });
});

describe("shuffle", () => {
  it("is a permutation of the input (same elements, same length)", () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const out = shuffle(input, mulberry32(42));
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input, mulberry32(1));
    expect(input).toEqual(copy);
  });

  it("is deterministic for a given seed", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(7));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(7));
    expect(a).toEqual(b);
  });
});

describe("selectEligibleForBracket", () => {
  it("selects exactly the target bracket size out of a larger pool", () => {
    const pool = Array.from({ length: 100 }, (_, i) => `pet-${i}`);
    const { size, selected } = selectEligibleForBracket(pool, mulberry32(1));
    expect(size).toBe(64);
    expect(selected).toHaveLength(64);
    // every selected pet must have come from the pool, with no duplicates
    expect(new Set(selected).size).toBe(64);
    for (const p of selected) expect(pool).toContain(p);
  });

  it("returns size 0 and an empty list when fewer than 2 are eligible", () => {
    expect(selectEligibleForBracket(["only-one"], mulberry32(1))).toEqual({
      size: 0,
      selected: [],
    });
    expect(selectEligibleForBracket([], mulberry32(1))).toEqual({
      size: 0,
      selected: [],
    });
  });

  it("uses the whole pool when it exactly matches a bracket size", () => {
    const pool = Array.from({ length: 8 }, (_, i) => `pet-${i}`);
    const { size, selected } = selectEligibleForBracket(pool, mulberry32(3));
    expect(size).toBe(8);
    expect(new Set(selected)).toEqual(new Set(pool));
  });
});

describe("pairFirstRound / pairNextRound", () => {
  it("pairs an 8-entry seed list into 4 quarter-final matchups", () => {
    const seeded = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const matchups = pairFirstRound(seeded);
    expect(matchups).toEqual([
      { position: 0, round: "QUARTERFINAL", a: "a", b: "b" },
      { position: 1, round: "QUARTERFINAL", a: "c", b: "d" },
      { position: 2, round: "QUARTERFINAL", a: "e", b: "f" },
      { position: 3, round: "QUARTERFINAL", a: "g", b: "h" },
    ]);
  });

  it("rejects an odd number of entries", () => {
    expect(() => pairFirstRound(["a", "b", "c"])).toThrow();
  });

  it("pairs winners in position order into the next round", () => {
    const winners = ["w0", "w1", "w2", "w3"];
    const next = pairNextRound(winners, "SEMIFINAL");
    expect(next).toEqual([
      { position: 0, round: "SEMIFINAL", a: "w0", b: "w1" },
      { position: 1, round: "SEMIFINAL", a: "w2", b: "w3" },
    ]);
  });

  it("reduces a full 64 bracket down to a single final winner across rounds", () => {
    const entries = Array.from({ length: 64 }, (_, i) => `p${i}`);
    let matchups = pairFirstRound(entries);
    expect(matchups).toHaveLength(32);

    const path = ["ROUND_32", "ROUND_16", "QUARTERFINAL", "SEMIFINAL", "FINAL"] as const;
    for (const nextRound of path) {
      // "a" always wins, deterministically, to trace the bracket down.
      const winners = matchups.map((m) => m.a);
      matchups = pairNextRound(winners, nextRound);
    }
    expect(matchups).toHaveLength(1);
    expect(matchups[0].round).toBe("FINAL");
  });
});
