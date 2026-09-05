import { describe, it, expect } from "vitest";
import { computeMonthlyWinner } from "@/lib/petOfMonth";

describe("computeMonthlyWinner", () => {
  it("picks the pet with the highest TOTAL votes across the month, not the weekly champion", () => {
    // Worked example from the spec: 1500 + 2000 + 1800 = 5300
    const winner = computeMonthlyWinner([
      { petId: "bella", totalVotes: 1500 + 2000 + 1800, petCreatedAt: new Date(2026, 0, 1) },
      { petId: "max", totalVotes: 5290, petCreatedAt: new Date(2026, 0, 1) },
    ]);
    expect(winner).toEqual({ petId: "bella", totalVotes: 5300 });
  });

  it("a pet can win Pet of the Month without ever winning a matchup", () => {
    // Represents a lovable underdog that racked up huge vote counts while
    // still losing every matchup on percentage.
    const winner = computeMonthlyWinner([
      { petId: "underdog", totalVotes: 9000, petCreatedAt: new Date(2026, 0, 5) },
      { petId: "weekly-champ", totalVotes: 4000, petCreatedAt: new Date(2026, 0, 1) },
    ]);
    expect(winner?.petId).toBe("underdog");
  });

  it("breaks an exact tie deterministically using earliest submission", () => {
    const winner = computeMonthlyWinner([
      { petId: "later", totalVotes: 1000, petCreatedAt: new Date(2026, 0, 10) },
      { petId: "earlier", totalVotes: 1000, petCreatedAt: new Date(2026, 0, 2) },
    ]);
    expect(winner?.petId).toBe("earlier");
  });

  it("returns null when there is no data for the month", () => {
    expect(computeMonthlyWinner([])).toBeNull();
  });
});
