import { describe, it, expect } from "vitest";
import { computeMatchupResult, resolveTieBreak } from "@/lib/scoring";
import { mulberry32 } from "./rng";

describe("computeMatchupResult", () => {
  it("matches the spec's worked example (Bella 63% / Max 37%)", () => {
    const result = computeMatchupResult({ petAVotes: 1248, petBVotes: 734 });
    expect(result.petAPercent).toBe(63);
    expect(result.petBPercent).toBe(37);
    expect(result.totalVotes).toBe(1982);
    expect(result.isTie).toBe(false);
  });

  it("percentages always sum to 100 once there is at least one vote", () => {
    const cases: [number, number][] = [
      [1, 2],
      [1, 1],
      [3, 1],
      [100, 1],
      [1, 0],
      [0, 1],
      [17, 13],
    ];
    for (const [a, b] of cases) {
      const r = computeMatchupResult({ petAVotes: a, petBVotes: b });
      expect(r.petAPercent + r.petBPercent).toBe(100);
    }
  });

  it("shows 0% / 0% with no votes cast yet, without dividing by zero", () => {
    const r = computeMatchupResult({ petAVotes: 0, petBVotes: 0 });
    expect(r.petAPercent).toBe(0);
    expect(r.petBPercent).toBe(0);
    expect(r.totalVotes).toBe(0);
    expect(r.isTie).toBe(false);
  });

  it("detects an exact tie", () => {
    const r = computeMatchupResult({ petAVotes: 42, petBVotes: 42 });
    expect(r.isTie).toBe(true);
    expect(r.petAPercent).toBe(50);
    expect(r.petBPercent).toBe(50);
  });
});

describe("resolveTieBreak", () => {
  it("picks A or B and always tags the method", () => {
    const r1 = resolveTieBreak(mulberry32(1));
    expect(["A", "B"]).toContain(r1.winner);
    expect(r1.method).toBe("RANDOM_TIE_BREAK");
    // different seeds are highly likely to diverge at least once across many draws
    const outcomes = new Set(
      Array.from({ length: 20 }, (_, i) => resolveTieBreak(mulberry32(i)).winner)
    );
    expect(outcomes.size).toBeGreaterThan(1);
  });

  it("is deterministic for a fixed seed", () => {
    expect(resolveTieBreak(mulberry32(99)).winner).toBe(
      resolveTieBreak(mulberry32(99)).winner
    );
  });
});
