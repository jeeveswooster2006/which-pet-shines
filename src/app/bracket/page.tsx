import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Flame } from "lucide-react";
import { PetPhoto } from "@/components/PetPhoto";
import { ButtonLink } from "@/components/Button";
import { getCurrentTournament, getLastCompletedTournament, getTournamentBracket } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Bracket",
  description: "This week's Which Pet Shines? tournament bracket.",
};

export default async function BracketPage() {
  const current = await getCurrentTournament();
  const tournament = current ?? (await getLastCompletedTournament())?.tournament ?? null;

  if (!tournament) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <span className="text-5xl" aria-hidden>
          🏆
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">No bracket yet</h1>
        <p className="mt-3 text-ink-soft">
          The first tournament kicks off once enough pets have entered. Be one of the first!
        </p>
        <div className="mt-6">
          <ButtonLink href="/enter">Enter your pet</ButtonLink>
        </div>
      </div>
    );
  }

  const rounds = await getTournamentBracket(tournament.id);

  return (
    <div className="px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
          {tournament.status === "COMPLETED" ? "Final bracket" : "This week's bracket"}
        </h1>
        <p className="mt-2 text-ink-soft">
          {tournament.bracketSize ?? "—"} pets · week {tournament.weekLabel}
          {tournament.status === "COMPLETED" && " · complete"}
        </p>
      </div>

      {rounds.length === 0 ? (
        <p className="mt-10 text-center text-ink-soft">
          The bracket hasn&apos;t been generated yet — check back once submissions close.
        </p>
      ) : (
        <div className="bracket-scroll mt-10 flex gap-6 px-4 pb-6 sm:justify-center">
          {rounds.map((round) => (
            <div key={round.round} className="flex w-64 shrink-0 flex-col gap-4">
              <h2 className="text-center text-sm font-bold uppercase tracking-wide text-ink-soft">
                {round.roundLabel}
              </h2>
              {round.matchups.map((m) => (
                <MatchupCard key={m.id} matchup={m} />
              ))}
            </div>
          ))}
        </div>
      )}

      {tournament.status === "COMPLETED" && tournament.championPetId && (
        <div className="mx-auto mt-12 flex max-w-md flex-col items-center gap-3 rounded-3xl bg-sunshine/30 p-8 text-center">
          <Trophy className="h-8 w-8 text-sunshine-deep" aria-hidden />
          <p className="font-display text-xl font-extrabold text-ink">We have a champion!</p>
          <ButtonLink href={`/pet/${rounds.at(-1)?.matchups[0]?.petA?.slug ?? ""}`}>
            See the winner
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function MatchupCard({
  matchup,
}: {
  matchup: {
    id: string;
    status: string;
    petA: { name: string; slug: string; photoUrl: string } | null;
    petB: { name: string; slug: string; photoUrl: string } | null;
    winnerPetId: string | null;
    petAId: string | null;
    petBId: string | null;
  };
}) {
  const isLive = matchup.status === "LIVE" || matchup.status === "SUDDEN_DEATH";
  const content = (
    <div
      className={`rounded-2xl border bg-card p-3 shadow-soft transition-transform ${
        isLive ? "border-coral hover:scale-[1.02]" : "border-border"
      }`}
    >
      <PetRow pet={matchup.petA} won={matchup.winnerPetId === matchup.petAId} />
      <div className="my-1 border-t border-dashed border-border" />
      <PetRow pet={matchup.petB} won={matchup.winnerPetId === matchup.petBId} />
      {isLive && (
        <p className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-coral-deep">
          {matchup.status === "SUDDEN_DEATH" ? (
            <>
              <Flame className="h-3 w-3" aria-hidden /> Sudden death
            </>
          ) : (
            "Live now"
          )}
        </p>
      )}
    </div>
  );

  return isLive ? (
    <Link href={`/vote/${matchup.id}`} aria-label="Vote in this matchup">
      {content}
    </Link>
  ) : (
    content
  );
}

function PetRow({
  pet,
  won,
}: {
  pet: { name: string; slug: string; photoUrl: string } | null;
  won: boolean;
}) {
  if (!pet) {
    return <p className="py-2 text-center text-sm text-ink-soft">TBD</p>;
  }
  return (
    <div className={`flex items-center gap-2 rounded-lg p-1.5 ${won ? "bg-mint/15" : ""}`}>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border">
        <PetPhoto src={pet.photoUrl} alt={pet.name} />
      </div>
      <span className={`truncate text-sm ${won ? "font-bold text-ink" : "text-ink-soft"}`}>{pet.name}</span>
      {won && <span aria-hidden>👑</span>}
    </div>
  );
}
