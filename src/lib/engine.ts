import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { tournaments, pets, entries, matchups, votes, awards } from "@/db/schema";
import {
  scheduleForUpcomingSubmissionWindow,
  scheduleForRound64Sunday,
} from "@/lib/schedule";
import {
  selectEligibleForBracket,
  pairFirstRound,
  pairNextRound,
  nextRoundInPath,
} from "@/lib/bracket";
import { resolveTieBreak } from "@/lib/scoring";
import { computeMonthlyWinner, type PetMonthlyVotes } from "@/lib/petOfMonth";
import { SUDDEN_DEATH_HOURS } from "@/lib/constants";
import type { Round, TournamentStatus } from "@/lib/types";

function matchupStatusForWindow(now: Date, start: Date, end: Date) {
  if (now < start) return "SCHEDULED" as const;
  if (now >= end) return "LIVE" as const; // will be resolved by progressLiveMatchups on the same tick
  return "LIVE" as const;
}

/**
 * Idempotent: makes sure there is a Tournament row open for submissions for
 * the upcoming Sunday's bracket. Safe to call as often as you like (e.g.
 * every cron tick) — it's a no-op once that week's row exists.
 */
export async function ensureSubmissionWindow(now: Date) {
  const schedule = scheduleForUpcomingSubmissionWindow(now);

  const [existing] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.weekLabel, schedule.weekLabel))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(tournaments)
    .values({
      weekLabel: schedule.weekLabel,
      submissionsOpenAt: schedule.submissionsOpenAt,
      submissionsCloseAt: schedule.submissionsCloseAt,
      status: "SUBMISSIONS_OPEN",
    })
    .returning();
  return created;
}

/**
 * For every tournament whose submission window has closed: randomly select
 * up to 64 approved entries (or the largest smaller power of two), generate
 * the first round's matchups, and kick the tournament off. Idempotent per
 * tournament — a tournament that already has a bracketSize is skipped.
 */
export async function closeSubmissionsAndGenerateBrackets(now: Date) {
  const due = await db
    .select()
    .from(tournaments)
    .where(
      and(
        eq(tournaments.status, "SUBMISSIONS_OPEN"),
        lte(tournaments.submissionsCloseAt, now)
      )
    );

  for (const tournament of due) {
    const approved = await db
      .select({ id: pets.id })
      .from(pets)
      .where(and(eq(pets.tournamentId, tournament.id), eq(pets.status, "APPROVED")));

    const { size, selected } = selectEligibleForBracket(approved.map((p) => p.id));

    if (size === 0) {
      await db
        .update(tournaments)
        .set({ status: "CANCELLED_NOT_ENOUGH_ENTRIES", updatedAt: new Date() })
        .where(eq(tournaments.id, tournament.id));
      continue;
    }

    await db.insert(entries).values(
      selected.map((petId, i) => ({
        tournamentId: tournament.id,
        petId,
        seed: i + 1,
      }))
    );

    const firstRoundMatchups = pairFirstRound(selected);
    const schedule = scheduleForRound64Sunday(tournament.submissionsCloseAt);
    const window = schedule.rounds[firstRoundMatchups[0].round];

    await db.insert(matchups).values(
      firstRoundMatchups.map((m) => ({
        tournamentId: tournament.id,
        round: m.round,
        position: m.position,
        petAId: m.a,
        petBId: m.b,
        startTime: window.start,
        endTime: window.end,
        status: matchupStatusForWindow(now, window.start, window.end),
      }))
    );

    await db
      .update(tournaments)
      .set({
        status: firstRoundMatchups[0].round as TournamentStatus,
        bracketSize: size,
        currentRound: firstRoundMatchups[0].round,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, tournament.id));
  }
}

async function tallyVotes(matchupId: string, phase: "REGULAR" | "SUDDEN_DEATH", petAId: string, petBId: string) {
  const rows = await db
    .select({ petId: votes.petId, count: sql<number>`count(*)::int` })
    .from(votes)
    .where(and(eq(votes.matchupId, matchupId), eq(votes.phase, phase)))
    .groupBy(votes.petId);

  const byPet = new Map(rows.map((r) => [r.petId, r.count]));
  return {
    petAVotes: byPet.get(petAId) ?? 0,
    petBVotes: byPet.get(petBId) ?? 0,
  };
}

/**
 * Activates matchups whose start time has arrived, resolves ones whose end
 * time has passed (including the sudden-death fallback path), all in one
 * idempotent pass. Safe to run as often as you like.
 */
export async function progressLiveMatchups(now: Date) {
  // Activate anything scheduled to have started.
  await db
    .update(matchups)
    .set({ status: "LIVE", updatedAt: new Date() })
    .where(and(eq(matchups.status, "SCHEDULED"), lte(matchups.startTime, now)));

  // Resolve regular-time matchups whose window has closed.
  const endedLive = await db
    .select()
    .from(matchups)
    .where(and(eq(matchups.status, "LIVE"), lte(matchups.endTime, now)));

  for (const m of endedLive) {
    if (!m.petAId || !m.petBId) continue; // defensive; shouldn't happen
    const tally = await tallyVotes(m.id, "REGULAR", m.petAId, m.petBId);
    // A genuine tie for engine purposes includes 0-0 (nobody voted in time) —
    // computeMatchupResult's isTie is display-oriented and treats 0-0 as "no
    // result yet" rather than "tied", which is not the right call here.
    const tied = tally.petAVotes === tally.petBVotes;

    if (!tied) {
      const winnerPetId = tally.petAVotes > tally.petBVotes ? m.petAId : m.petBId;
      await db
        .update(matchups)
        .set({
          status: "COMPLETED",
          winnerPetId,
          winnerMethod: "VOTES",
          updatedAt: new Date(),
        })
        .where(eq(matchups.id, m.id));
    } else {
      await db
        .update(matchups)
        .set({
          status: "SUDDEN_DEATH",
          suddenDeathEndsAt: new Date(m.endTime.getTime() + SUDDEN_DEATH_HOURS * 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(matchups.id, m.id));
    }
  }

  // Resolve sudden-death matchups whose one-hour window has closed.
  const endedSuddenDeath = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.status, "SUDDEN_DEATH"),
        lte(matchups.suddenDeathEndsAt, now)
      )
    );

  for (const m of endedSuddenDeath) {
    if (!m.petAId || !m.petBId) continue;
    const tally = await tallyVotes(m.id, "SUDDEN_DEATH", m.petAId, m.petBId);
    const tied = tally.petAVotes === tally.petBVotes;

    if (!tied) {
      const winnerPetId = tally.petAVotes > tally.petBVotes ? m.petAId : m.petBId;
      await db
        .update(matchups)
        .set({
          status: "COMPLETED",
          winnerPetId,
          winnerMethod: "SUDDEN_DEATH_VOTES",
          updatedAt: new Date(),
        })
        .where(eq(matchups.id, m.id));
    } else {
      const tieBreak = resolveTieBreak();
      const winnerPetId = tieBreak.winner === "A" ? m.petAId : m.petBId;
      await db
        .update(matchups)
        .set({
          status: "COMPLETED",
          winnerPetId,
          winnerMethod: "RANDOM_TIE_BREAK",
          updatedAt: new Date(),
        })
        .where(eq(matchups.id, m.id));
    }
  }
}

/**
 * When every matchup in a tournament's current round is COMPLETED, pairs the
 * winners into the next round (or crowns the champion if that was the
 * FINAL). Idempotent — skips tournaments whose next round already exists.
 */
export async function advanceRoundsIfComplete(now: Date) {
  const active = await db
    .select()
    .from(tournaments)
    .where(
      inArray(tournaments.status, [
        "ROUND_64",
        "ROUND_32",
        "ROUND_16",
        "QUARTERFINAL",
        "SEMIFINAL",
        "FINAL",
      ])
    );

  for (const tournament of active) {
    if (!tournament.currentRound || !tournament.bracketSize) continue;

    const roundMatchups = await db
      .select()
      .from(matchups)
      .where(
        and(
          eq(matchups.tournamentId, tournament.id),
          eq(matchups.round, tournament.currentRound)
        )
      )
      .orderBy(matchups.position);

    if (roundMatchups.length === 0) continue;
    const allComplete = roundMatchups.every((m) => m.status === "COMPLETED");
    if (!allComplete) continue;

    const next = nextRoundInPath(tournament.currentRound as Round, tournament.bracketSize);
    const winners = roundMatchups.map((m) => m.winnerPetId!) as string[];

    if (next === null) {
      // That was the FINAL — crown the champion (idempotent: only if not already set).
      if (tournament.championPetId) continue;
      const championPetId = winners[0];
      await db
        .update(tournaments)
        .set({ status: "COMPLETED", championPetId, updatedAt: new Date() })
        .where(eq(tournaments.id, tournament.id));

      await db
        .insert(awards)
        .values({
          type: "WEEKLY_CHAMPION",
          petId: championPetId,
          tournamentId: tournament.id,
        })
        .onConflictDoNothing();
      continue;
    }

    // Skip if the next round has already been generated (idempotency guard).
    const [already] = await db
      .select({ id: matchups.id })
      .from(matchups)
      .where(and(eq(matchups.tournamentId, tournament.id), eq(matchups.round, next)))
      .limit(1);
    if (already) continue;

    const schedule = scheduleForRound64Sunday(tournament.submissionsCloseAt);
    const window = schedule.rounds[next];
    const pairs = pairNextRound(winners, next);

    await db.insert(matchups).values(
      pairs.map((m) => ({
        tournamentId: tournament.id,
        round: m.round,
        position: m.position,
        petAId: m.a,
        petBId: m.b,
        startTime: window.start,
        endTime: window.end,
        status: matchupStatusForWindow(now, window.start, window.end),
      }))
    );

    await db
      .update(tournaments)
      .set({ status: next as TournamentStatus, currentRound: next, updatedAt: new Date() })
      .where(eq(tournaments.id, tournament.id));
  }
}

/** One full scheduler pass — call this from a cron endpoint on a regular cadence (every few minutes is plenty). */
export async function runSchedulerTick(now: Date = new Date()) {
  await ensureSubmissionWindow(now);
  await closeSubmissionsAndGenerateBrackets(now);
  await progressLiveMatchups(now);
  await advanceRoundsIfComplete(now);
}

/**
 * Pet of the Month for a given calendar month: the pet with the highest
 * TOTAL votes across all its matchups that month (not the weekly champion).
 * Safe to re-run — upserts the single Award row for that month/year.
 */
export async function computeAndApplyPetOfMonth(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month % 12, 1));

  const rows = await db
    .select({
      petId: votes.petId,
      totalVotes: sql<number>`count(*)::int`,
      petCreatedAt: pets.createdAt,
    })
    .from(votes)
    .innerJoin(pets, eq(pets.id, votes.petId))
    .where(and(sql`${votes.createdAt} >= ${start}`, sql`${votes.createdAt} < ${end}`))
    .groupBy(votes.petId, pets.createdAt);

  const tallies: PetMonthlyVotes[] = rows.map((r) => ({
    petId: r.petId,
    totalVotes: r.totalVotes,
    petCreatedAt: r.petCreatedAt,
  }));

  const winner = computeMonthlyWinner(tallies);
  if (!winner) return null;

  await db
    .insert(awards)
    .values({
      type: "POTM",
      petId: winner.petId,
      month,
      year,
      totalVotes: winner.totalVotes,
    })
    .onConflictDoUpdate({
      target: [awards.type, awards.month, awards.year],
      set: { petId: winner.petId, totalVotes: winner.totalVotes },
    });

  return winner;
}
