import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matchups, votes } from "@/db/schema";
import { voteSchema } from "@/lib/validation";
import { getOrCreateVoterId } from "@/lib/auth/voterId";
import { getVoteTally } from "@/db/queries";
import { computeMatchupResult } from "@/lib/scoring";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  }
  const { matchupId, petId } = parsed.data;

  const [matchup] = await db.select().from(matchups).where(eq(matchups.id, matchupId));
  if (!matchup) {
    return NextResponse.json({ error: "Matchup not found" }, { status: 404 });
  }
  if (matchup.status !== "LIVE" && matchup.status !== "SUDDEN_DEATH") {
    return NextResponse.json({ error: "Voting isn't open for this matchup right now" }, { status: 409 });
  }
  if (petId !== matchup.petAId && petId !== matchup.petBId) {
    return NextResponse.json({ error: "That pet isn't in this matchup" }, { status: 400 });
  }

  const voterId = await getOrCreateVoterId();
  const phase = matchup.status === "SUDDEN_DEATH" ? "SUDDEN_DEATH" : "REGULAR";

  try {
    await db.insert(votes).values({ matchupId, petId, voterId, phase });
  } catch {
    // Unique constraint violation => already voted this phase. Not an error
    // from the user's point of view — just show them the current results.
  }

  const tally = await getVoteTally(matchupId, phase);
  const petAVotes = tally.find((t) => t.petId === matchup.petAId)?.count ?? 0;
  const petBVotes = tally.find((t) => t.petId === matchup.petBId)?.count ?? 0;
  const result = computeMatchupResult({ petAVotes, petBVotes });

  return NextResponse.json({
    ok: true,
    matchupId,
    petAId: matchup.petAId,
    petBId: matchup.petBId,
    ...result,
  });
}
