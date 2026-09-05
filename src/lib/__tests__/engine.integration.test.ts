import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql, eq, and } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { tournaments, pets, entries, matchups, votes, awards } from "@/db/schema";
import {
  ensureSubmissionWindow,
  closeSubmissionsAndGenerateBrackets,
  progressLiveMatchups,
  advanceRoundsIfComplete,
  computeAndApplyPetOfMonth,
} from "@/lib/engine";

async function truncateAll() {
  await db.execute(
    sql`TRUNCATE TABLE awards, votes, reactions, matchups, entries, verification_tokens, pets, tournaments, admin_users RESTART IDENTITY CASCADE`
  );
}

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await pool.end();
});

async function makeTournament(overrides: Partial<typeof tournaments.$inferInsert> = {}) {
  const [t] = await db
    .insert(tournaments)
    .values({
      weekLabel: `2026-W${Math.floor(Math.random() * 50) + 1}`,
      submissionsOpenAt: new Date(Date.UTC(2026, 8, 1)),
      submissionsCloseAt: new Date(Date.UTC(2026, 8, 6)), // a Sunday
      status: "SUBMISSIONS_OPEN",
      ...overrides,
    })
    .returning();
  return t;
}

async function makePet(tournamentId: string, overrides: Partial<typeof pets.$inferInsert> = {}) {
  const n = Math.random().toString(36).slice(2, 8);
  const [p] = await db
    .insert(pets)
    .values({
      name: `Pet ${n}`,
      slug: `pet-${n}`,
      photoUrl: "/uploads/placeholder.jpg",
      ownerEmail: `owner-${n}@example.com`,
      status: "APPROVED",
      agreedToRules: true,
      tournamentId,
      ...overrides,
    })
    .returning();
  return p;
}

describe("ensureSubmissionWindow", () => {
  it("creates exactly one tournament row per week, even if called repeatedly", async () => {
    const now = new Date(Date.UTC(2026, 8, 9, 12)); // Wednesday
    const a = await ensureSubmissionWindow(now);
    const b = await ensureSubmissionWindow(now);
    expect(a.id).toBe(b.id);

    const all = await db.select().from(tournaments);
    expect(all).toHaveLength(1);
  });
});

describe("one pet entry per person per weekly tournament", () => {
  it("rejects a second pet from the same email in the same tournament", async () => {
    const t = await makeTournament();
    await makePet(t.id, { ownerEmail: "same@example.com" });
    await expect(
      makePet(t.id, { ownerEmail: "same@example.com" })
    ).rejects.toThrow();
  });

  it("allows the same email to enter different tournaments", async () => {
    const t1 = await makeTournament({ weekLabel: "2026-W01" });
    const t2 = await makeTournament({ weekLabel: "2026-W02" });
    await makePet(t1.id, { ownerEmail: "same@example.com" });
    await expect(
      makePet(t2.id, { ownerEmail: "same@example.com" })
    ).resolves.toBeDefined();
  });
});

describe("closeSubmissionsAndGenerateBrackets", () => {
  it("selects the largest suitable power-of-two bracket and creates first-round matchups", async () => {
    const t = await makeTournament({
      submissionsCloseAt: new Date(Date.UTC(2026, 8, 6)), // Sunday
    });
    // 10 approved pets -> bracket size 8 (largest power of two <= 10)
    for (let i = 0; i < 10; i++) await makePet(t.id);

    await closeSubmissionsAndGenerateBrackets(new Date(Date.UTC(2026, 8, 6, 1)));

    const [updated] = await db.select().from(tournaments).where(eq(tournaments.id, t.id));
    expect(updated.bracketSize).toBe(8);
    expect(updated.currentRound).toBe("QUARTERFINAL");
    expect(updated.status).toBe("QUARTERFINAL");

    const createdEntries = await db.select().from(entries).where(eq(entries.tournamentId, t.id));
    expect(createdEntries).toHaveLength(8);

    const createdMatchups = await db
      .select()
      .from(matchups)
      .where(eq(matchups.tournamentId, t.id));
    expect(createdMatchups).toHaveLength(4);
    expect(new Set(createdMatchups.map((m) => m.round))).toEqual(new Set(["QUARTERFINAL"]));
  });

  it("cancels the tournament when fewer than 2 pets are approved", async () => {
    const t = await makeTournament({ submissionsCloseAt: new Date(Date.UTC(2026, 8, 6)) });
    await makePet(t.id);

    await closeSubmissionsAndGenerateBrackets(new Date(Date.UTC(2026, 8, 6, 1)));

    const [updated] = await db.select().from(tournaments).where(eq(tournaments.id, t.id));
    expect(updated.status).toBe("CANCELLED_NOT_ENOUGH_ENTRIES");
  });
});

describe("full progression: votes -> winner -> next round -> champion", () => {
  it("advances a 4-pet bracket through SEMIFINAL to a crowned champion", async () => {
    const round64Sunday = new Date(Date.UTC(2026, 8, 6));
    const t = await makeTournament({ submissionsCloseAt: round64Sunday });
    for (let i = 0; i < 4; i++) await makePet(t.id);

    // Generate the bracket (SEMIFINAL round for a 4-pet bracket) right as it starts.
    await closeSubmissionsAndGenerateBrackets(new Date(Date.UTC(2026, 8, 6, 0, 0, 1)));

    let semis = await db
      .select()
      .from(matchups)
      .where(and(eq(matchups.tournamentId, t.id), eq(matchups.round, "SEMIFINAL")))
      .orderBy(matchups.position);
    expect(semis).toHaveLength(2);

    // Cast decisive (non-tied) votes for petA in both semis.
    for (const m of semis) {
      await db.insert(votes).values({ matchupId: m.id, petId: m.petAId!, voterId: "v1" });
      await db.insert(votes).values({ matchupId: m.id, petId: m.petAId!, voterId: "v2" });
      await db.insert(votes).values({ matchupId: m.id, petId: m.petBId!, voterId: "v3" });
    }

    // Move "now" to just after the SEMIFINAL round ends.
    const afterSemis = new Date(round64Sunday.getTime() + 5 * 24 * 60 * 60 * 1000 + 1000);
    await progressLiveMatchups(afterSemis);

    semis = await db
      .select()
      .from(matchups)
      .where(and(eq(matchups.tournamentId, t.id), eq(matchups.round, "SEMIFINAL")));
    expect(semis.every((m) => m.status === "COMPLETED")).toBe(true);
    expect(semis.every((m) => m.winnerMethod === "VOTES")).toBe(true);

    await advanceRoundsIfComplete(afterSemis);

    const final = await db
      .select()
      .from(matchups)
      .where(and(eq(matchups.tournamentId, t.id), eq(matchups.round, "FINAL")));
    expect(final).toHaveLength(1);
    expect(final[0].petAId).toBe(semis[0].winnerPetId);
    expect(final[0].petBId).toBe(semis[1].winnerPetId);

    // Vote in the final and progress past it.
    await db.insert(votes).values({ matchupId: final[0].id, petId: final[0].petAId!, voterId: "v1" });
    const afterFinal = new Date(round64Sunday.getTime() + 6 * 24 * 60 * 60 * 1000 + 1000);
    await progressLiveMatchups(afterFinal);
    await advanceRoundsIfComplete(afterFinal);

    const [finished] = await db.select().from(tournaments).where(eq(tournaments.id, t.id));
    expect(finished.status).toBe("COMPLETED");
    expect(finished.championPetId).toBe(final[0].petAId);

    const championAwards = await db
      .select()
      .from(awards)
      .where(and(eq(awards.type, "WEEKLY_CHAMPION"), eq(awards.tournamentId, t.id)));
    expect(championAwards).toHaveLength(1);
    expect(championAwards[0].petId).toBe(final[0].petAId);
  });
});

describe("tie -> sudden death -> random tie-break", () => {
  it("opens a one-hour sudden-death window on a tie, then force-resolves if still tied", async () => {
    const round64Sunday = new Date(Date.UTC(2026, 8, 6));
    const t = await makeTournament({ submissionsCloseAt: round64Sunday });
    const petA = await makePet(t.id);
    const petB = await makePet(t.id);

    const [m] = await db
      .insert(matchups)
      .values({
        tournamentId: t.id,
        round: "FINAL",
        position: 0,
        petAId: petA.id,
        petBId: petB.id,
        startTime: new Date(round64Sunday),
        endTime: new Date(round64Sunday.getTime() + 1000),
        status: "LIVE",
      })
      .returning();

    await db.insert(votes).values({ matchupId: m.id, petId: petA.id, voterId: "v1", phase: "REGULAR" });
    await db.insert(votes).values({ matchupId: m.id, petId: petB.id, voterId: "v2", phase: "REGULAR" });

    const justAfterEnd = new Date(m.endTime.getTime() + 500);
    await progressLiveMatchups(justAfterEnd);

    let [row] = await db.select().from(matchups).where(eq(matchups.id, m.id));
    expect(row.status).toBe("SUDDEN_DEATH");
    expect(row.suddenDeathEndsAt).not.toBeNull();

    // Still tied (no sudden-death votes cast) once the window closes.
    const afterSuddenDeath = new Date(row.suddenDeathEndsAt!.getTime() + 1000);
    await progressLiveMatchups(afterSuddenDeath);

    [row] = await db.select().from(matchups).where(eq(matchups.id, m.id));
    expect(row.status).toBe("COMPLETED");
    expect(row.winnerMethod).toBe("RANDOM_TIE_BREAK");
    expect([petA.id, petB.id]).toContain(row.winnerPetId);
  });

  it("a sudden-death vote can break the tie without falling back to random", async () => {
    const round64Sunday = new Date(Date.UTC(2026, 8, 6));
    const t = await makeTournament({ submissionsCloseAt: round64Sunday });
    const petA = await makePet(t.id);
    const petB = await makePet(t.id);

    const [m] = await db
      .insert(matchups)
      .values({
        tournamentId: t.id,
        round: "FINAL",
        position: 0,
        petAId: petA.id,
        petBId: petB.id,
        startTime: new Date(round64Sunday),
        endTime: new Date(round64Sunday.getTime() + 1000),
        status: "LIVE",
        suddenDeathEndsAt: null,
      })
      .returning();

    await db.insert(votes).values({ matchupId: m.id, petId: petA.id, voterId: "v1", phase: "REGULAR" });
    await db.insert(votes).values({ matchupId: m.id, petId: petB.id, voterId: "v2", phase: "REGULAR" });
    await progressLiveMatchups(new Date(m.endTime.getTime() + 500));

    let [row] = await db.select().from(matchups).where(eq(matchups.id, m.id));
    expect(row.status).toBe("SUDDEN_DEATH");

    // A sudden-death vote breaks the tie decisively for petA.
    await db.insert(votes).values({ matchupId: m.id, petId: petA.id, voterId: "v3", phase: "SUDDEN_DEATH" });

    await progressLiveMatchups(new Date(row.suddenDeathEndsAt!.getTime() + 1000));
    [row] = await db.select().from(matchups).where(eq(matchups.id, m.id));
    expect(row.status).toBe("COMPLETED");
    expect(row.winnerMethod).toBe("SUDDEN_DEATH_VOTES");
    expect(row.winnerPetId).toBe(petA.id);
  });
});

describe("computeAndApplyPetOfMonth", () => {
  it("crowns the pet with the highest TOTAL votes that month, independent of who won any matchup", async () => {
    const t = await makeTournament();
    const underdog = await makePet(t.id);
    const champ = await makePet(t.id);

    const [m1] = await db
      .insert(matchups)
      .values({
        tournamentId: t.id,
        round: "FINAL",
        position: 0,
        petAId: underdog.id,
        petBId: champ.id,
        startTime: new Date(Date.UTC(2026, 8, 1)),
        endTime: new Date(Date.UTC(2026, 8, 2)),
        status: "COMPLETED",
        winnerPetId: champ.id,
        winnerMethod: "VOTES",
      })
      .returning();

    // Underdog loses the matchup on percentage but racks up more raw votes overall.
    for (let i = 0; i < 90; i++) {
      await db.insert(votes).values({
        matchupId: m1.id,
        petId: underdog.id,
        voterId: `u${i}`,
        createdAt: new Date(Date.UTC(2026, 8, 15)),
      });
    }
    for (let i = 0; i < 60; i++) {
      await db.insert(votes).values({
        matchupId: m1.id,
        petId: champ.id,
        voterId: `c${i}`,
        createdAt: new Date(Date.UTC(2026, 8, 15)),
      });
    }

    const winner = await computeAndApplyPetOfMonth(9, 2026);
    expect(winner?.petId).toBe(underdog.id);

    const [award] = await db
      .select()
      .from(awards)
      .where(and(eq(awards.type, "POTM"), eq(awards.month, 9), eq(awards.year, 2026)));
    expect(award.petId).toBe(underdog.id);
    expect(award.totalVotes).toBe(90);
  });

  it("is idempotent — re-running for the same month updates rather than duplicates", async () => {
    const t = await makeTournament();
    const pet = await makePet(t.id);
    const [m] = await db
      .insert(matchups)
      .values({
        tournamentId: t.id,
        round: "FINAL",
        position: 0,
        petAId: pet.id,
        petBId: pet.id,
        startTime: new Date(Date.UTC(2026, 8, 1)),
        endTime: new Date(Date.UTC(2026, 8, 2)),
        status: "COMPLETED",
      })
      .returning();
    await db.insert(votes).values({
      matchupId: m.id,
      petId: pet.id,
      voterId: "v1",
      createdAt: new Date(Date.UTC(2026, 8, 15)),
    });

    await computeAndApplyPetOfMonth(9, 2026);
    await computeAndApplyPetOfMonth(9, 2026);

    const rows = await db
      .select()
      .from(awards)
      .where(and(eq(awards.type, "POTM"), eq(awards.month, 9), eq(awards.year, 2026)));
    expect(rows).toHaveLength(1);
  });
});
