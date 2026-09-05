import type { Metadata } from "next";
import Link from "next/link";
import { getMatchupWithPets, getVoteTally, hasVoted } from "@/db/queries";
import { peekVoterId } from "@/lib/auth/voterId";
import { computeMatchupResult } from "@/lib/scoring";
import { MatchupVoter } from "@/components/MatchupVoter";
import { ButtonLink } from "@/components/Button";

export const dynamic = "force-dynamic";

type Params = Promise<{ matchupId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { matchupId } = await params;
  const matchup = await getMatchupWithPets(matchupId);
  if (!matchup?.petA || !matchup?.petB) return { title: "Vote" };
  return {
    title: `${matchup.petA.name} vs ${matchup.petB.name}`,
    description: `Vote: ${matchup.petA.name} or ${matchup.petB.name} — who shines this round?`,
  };
}

export default async function MatchupVotePage({ params }: { params: Params }) {
  const { matchupId } = await params;
  const matchup = await getMatchupWithPets(matchupId);

  if (!matchup || !matchup.petA || !matchup.petB) {
    return <NotLive reason="That matchup doesn't exist (anymore)." />;
  }

  if (matchup.status !== "LIVE" && matchup.status !== "SUDDEN_DEATH") {
    return (
      <NotLive
        reason={
          matchup.status === "COMPLETED"
            ? "This matchup has already finished."
            : "This matchup hasn't started yet."
        }
        petSlug={matchup.status === "COMPLETED" ? matchup.petA.slug : undefined}
      />
    );
  }

  const phase = matchup.status === "SUDDEN_DEATH" ? "SUDDEN_DEATH" : "REGULAR";
  const voterId = await peekVoterId();
  const existingVote = voterId ? await hasVoted(matchupId, voterId, phase) : null;

  const tally = await getVoteTally(matchupId, phase);
  const petAVotes = tally.find((t) => t.petId === matchup.petAId)?.count ?? 0;
  const petBVotes = tally.find((t) => t.petId === matchup.petBId)?.count ?? 0;
  const result = computeMatchupResult({ petAVotes, petBVotes });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <div className="px-4 py-10 sm:py-14">
      <MatchupVoter
        matchupId={matchup.id}
        round={matchup.round}
        status={matchup.status as "LIVE" | "SUDDEN_DEATH"}
        petA={matchup.petA}
        petB={matchup.petB}
        initialResult={result}
        alreadyVotedPetId={existingVote?.petId ?? null}
        siteUrl={siteUrl}
      />
    </div>
  );
}

function NotLive({ reason, petSlug }: { reason: string; petSlug?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="text-5xl" aria-hidden>
        🙈
      </span>
      <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">{reason}</h1>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/vote">Find a live matchup</ButtonLink>
        {petSlug && (
          <ButtonLink href={`/pet/${petSlug}`} variant="outline">
            See result
          </ButtonLink>
        )}
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        <Link href="/bracket" className="underline">
          View the full bracket
        </Link>
      </p>
    </div>
  );
}
