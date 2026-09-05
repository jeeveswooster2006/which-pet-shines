import { and, desc, eq, or, sql, asc, ne, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  tournaments,
  pets,
  matchups,
  votes,
  awards,
  reactions,
} from "@/db/schema";
import { ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";
import type { Round } from "@/lib/types";

export async function getCurrentTournament() {
  const [t] = await db
    .select()
    .from(tournaments)
    .where(
      or(
        eq(tournaments.status, "ROUND_64"),
        eq(tournaments.status, "ROUND_32"),
        eq(tournaments.status, "ROUND_16"),
        eq(tournaments.status, "QUARTERFINAL"),
        eq(tournaments.status, "SEMIFINAL"),
        eq(tournaments.status, "FINAL")
      )
    )
    .orderBy(desc(tournaments.createdAt))
    .limit(1);
  return t ?? null;
}

export async function getOpenSubmissionTournament() {
  const [t] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, "SUBMISSIONS_OPEN"))
    .orderBy(desc(tournaments.createdAt))
    .limit(1);
  return t ?? null;
}

export async function getLastCompletedTournament() {
  const [t] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, "COMPLETED"))
    .orderBy(desc(tournaments.updatedAt))
    .limit(1);
  if (!t || !t.championPetId) return null;
  const [champion] = await db.select().from(pets).where(eq(pets.id, t.championPetId));
  return { tournament: t, champion };
}

export async function getTournamentBracket(tournamentId: string) {
  const rows = await db
    .select()
    .from(matchups)
    .where(eq(matchups.tournamentId, tournamentId))
    .orderBy(asc(matchups.round), asc(matchups.position));

  const petIds = new Set<string>();
  for (const m of rows) {
    if (m.petAId) petIds.add(m.petAId);
    if (m.petBId) petIds.add(m.petBId);
  }
  const petRows = petIds.size
    ? await db.select().from(pets).where(inArray(pets.id, Array.from(petIds)))
    : [];
  const petsById = new Map(petRows.map((p) => [p.id, p]));

  const byRound = new Map<Round, typeof rows>();
  for (const m of rows) {
    const list = byRound.get(m.round) ?? [];
    list.push(m);
    byRound.set(m.round, list);
  }

  // Iterate ROUND_ORDER (not the Map's insertion/SQL order, which sorts the
  // enum alphabetically — FINAL would come before ROUND_64) so rounds always
  // display in actual tournament progression order.
  return ROUND_ORDER.filter((round) => byRound.has(round)).map((round) => {
    const ms = byRound.get(round)!;
    return {
    round,
    roundLabel: ROUND_LABELS[round],
    matchups: ms
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        ...m,
        petA: m.petAId ? petsById.get(m.petAId) ?? null : null,
        petB: m.petBId ? petsById.get(m.petBId) ?? null : null,
      })),
    };
  });
}

export async function getMatchupWithPets(matchupId: string) {
  const [m] = await db.select().from(matchups).where(eq(matchups.id, matchupId));
  if (!m) return null;
  const petIds = [m.petAId, m.petBId].filter(Boolean) as string[];
  const petRows = await db.select().from(pets).where(inArray(pets.id, petIds));
  const petA = petRows.find((p) => p.id === m.petAId) ?? null;
  const petB = petRows.find((p) => p.id === m.petBId) ?? null;
  return { ...m, petA, petB };
}

/** Picks a random currently-live matchup for the "Vote Now" flow. */
export async function getRandomLiveMatchup(excludeMatchupId?: string) {
  const conditions = [eq(matchups.status, "LIVE")];
  if (excludeMatchupId) conditions.push(ne(matchups.id, excludeMatchupId));

  const [m] = await db
    .select()
    .from(matchups)
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(1);
  if (!m) return null;
  return getMatchupWithPets(m.id);
}

export async function getVoteTally(matchupId: string, phase: "REGULAR" | "SUDDEN_DEATH" = "REGULAR") {
  const rows = await db
    .select({ petId: votes.petId, count: sql<number>`count(*)::int` })
    .from(votes)
    .where(and(eq(votes.matchupId, matchupId), eq(votes.phase, phase)))
    .groupBy(votes.petId);
  return rows;
}

export async function hasVoted(matchupId: string, voterId: string, phase: "REGULAR" | "SUDDEN_DEATH") {
  const [row] = await db
    .select({ petId: votes.petId })
    .from(votes)
    .where(
      and(eq(votes.matchupId, matchupId), eq(votes.voterId, voterId), eq(votes.phase, phase))
    )
    .limit(1);
  return row ?? null;
}

export async function getPetBySlug(slug: string) {
  const [pet] = await db.select().from(pets).where(eq(pets.slug, slug));
  if (!pet) return null;

  const matchupRows = await db
    .select()
    .from(matchups)
    .where(or(eq(matchups.petAId, pet.id), eq(matchups.petBId, pet.id)))
    .orderBy(asc(matchups.round), asc(matchups.position));

  const opponentIds = matchupRows
    .map((m) => (m.petAId === pet.id ? m.petBId : m.petAId))
    .filter(Boolean) as string[];
  const opponents = opponentIds.length
    ? await db.select().from(pets).where(inArray(pets.id, opponentIds))
    : [];
  const opponentsById = new Map(opponents.map((p) => [p.id, p]));

  const voteRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(votes)
    .where(eq(votes.petId, pet.id));
  const totalVotes = voteRows[0]?.total ?? 0;

  const petAwards = await db.select().from(awards).where(eq(awards.petId, pet.id));

  return {
    pet,
    matchups: matchupRows.map((m) => ({
      ...m,
      opponent: (m.petAId === pet.id ? m.petBId : m.petAId)
        ? opponentsById.get((m.petAId === pet.id ? m.petBId : m.petAId)!) ?? null
        : null,
      isPetA: m.petAId === pet.id,
    })),
    totalVotes,
    awards: petAwards,
  };
}

export async function getHallOfFame() {
  const rows = await db
    .select()
    .from(awards)
    .where(eq(awards.type, "POTM"))
    .orderBy(desc(awards.year), desc(awards.month));
  const petIds = rows.map((r) => r.petId);
  const petRows = petIds.length
    ? await db.select().from(pets).where(inArray(pets.id, petIds))
    : [];
  const petsById = new Map(petRows.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, pet: petsById.get(r.petId) ?? null }));
}

export async function getCurrentPetOfTheMonthLeader(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month % 12, 1));

  const rows = await db
    .select({ petId: votes.petId, totalVotes: sql<number>`count(*)::int` })
    .from(votes)
    .where(and(sql`${votes.createdAt} >= ${start}`, sql`${votes.createdAt} < ${end}`))
    .groupBy(votes.petId)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  if (!rows[0]) return null;
  const [pet] = await db.select().from(pets).where(eq(pets.id, rows[0].petId));
  return { pet, totalVotes: rows[0].totalVotes };
}

export async function getPendingSubmissions() {
  return db
    .select()
    .from(pets)
    .where(eq(pets.status, "PENDING"))
    .orderBy(desc(pets.createdAt));
}

export async function getAdminOverview() {
  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pets)
    .where(eq(pets.status, "PENDING"));

  const recentTournaments = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.createdAt))
    .limit(10);

  return {
    pendingCount: pendingCount?.count ?? 0,
    recentTournaments,
  };
}

export async function getReactionCounts(petId: string) {
  const rows = await db
    .select({ emoji: reactions.emoji, count: sql<number>`count(*)::int` })
    .from(reactions)
    .where(eq(reactions.petId, petId))
    .groupBy(reactions.emoji);
  return rows;
}

export async function slugExists(slug: string) {
  const [row] = await db.select({ id: pets.id }).from(pets).where(eq(pets.slug, slug)).limit(1);
  return !!row;
}

export async function getRoundProgress(tournamentId: string, round: Round) {
  const rows = await db
    .select()
    .from(matchups)
    .where(and(eq(matchups.tournamentId, tournamentId), eq(matchups.round, round)));
  return {
    total: rows.length,
    completed: rows.filter((m) => m.status === "COMPLETED").length,
    live: rows.filter((m) => m.status === "LIVE" || m.status === "SUDDEN_DEATH").length,
  };
}

export async function getEntryCountForTournament(tournamentId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pets)
    .where(and(eq(pets.tournamentId, tournamentId), eq(pets.status, "APPROVED")));
  return row?.count ?? 0;
}
