"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Flame } from "lucide-react";
import { PetPhoto } from "@/components/PetPhoto";
import { ReactionBar } from "@/components/ReactionBar";
import { ShareButtons } from "@/components/ShareButtons";
import { ROUND_LABELS } from "@/lib/constants";
import type { Round } from "@/lib/types";

interface PetLite {
  id: string;
  name: string;
  slug: string;
  photoUrl: string;
  species: string | null;
}

interface MatchupVoterProps {
  matchupId: string;
  round: Round;
  status: "LIVE" | "SUDDEN_DEATH";
  petA: PetLite;
  petB: PetLite;
  initialResult: {
    petAVotes: number;
    petBVotes: number;
    totalVotes: number;
    petAPercent: number;
    petBPercent: number;
  };
  alreadyVotedPetId: string | null;
  siteUrl: string;
}

export function MatchupVoter({
  matchupId,
  round,
  status,
  petA,
  petB,
  initialResult,
  alreadyVotedPetId,
  siteUrl,
}: MatchupVoterProps) {
  const router = useRouter();
  const [votedPetId, setVotedPetId] = useState<string | null>(alreadyVotedPetId);
  const [result, setResult] = useState(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadingNext, setLoadingNext] = useState(false);

  const hasVoted = votedPetId !== null;

  async function castVote(petId: string) {
    if (hasVoted || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchupId, petId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Couldn't record that vote — please try again.");
          return;
        }
        setResult({
          petAVotes: data.petAVotes,
          petBVotes: data.petBVotes,
          totalVotes: data.totalVotes,
          petAPercent: data.petAPercent,
          petBPercent: data.petBPercent,
        });
        setVotedPetId(petId);
      } catch {
        setError("Couldn't record that vote — check your connection and try again.");
      }
    });
  }

  async function nextMatchup() {
    setLoadingNext(true);
    try {
      const res = await fetch(`/api/matchups/random?exclude=${matchupId}`);
      const data = await res.json();
      if (data.matchupId) {
        router.push(`/vote/${data.matchupId}`);
      } else {
        router.push("/vote");
      }
    } finally {
      setLoadingNext(false);
    }
  }

  const votedForA = votedPetId === petA.id;
  const votedForB = votedPetId === petB.id;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-center">
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {ROUND_LABELS[round]}
        </span>
        {status === "SUDDEN_DEATH" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sunshine px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
            <Flame className="h-3.5 w-3.5" aria-hidden /> Sudden death!
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5" role="group" aria-label="Vote for your favourite">
        <PetOption
          pet={petA}
          onVote={() => castVote(petA.id)}
          disabled={hasVoted || isPending}
          voted={votedForA}
          showResult={hasVoted}
          percent={result.petAPercent}
          votes={result.petAVotes}
          isPending={isPending}
        />
        <PetOption
          pet={petB}
          onVote={() => castVote(petB.id)}
          disabled={hasVoted || isPending}
          voted={votedForB}
          showResult={hasVoted}
          percent={result.petBPercent}
          votes={result.petBVotes}
          isPending={isPending}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-center text-sm font-semibold text-coral-deep">
          {error}
        </p>
      )}

      {hasVoted && (
        <div className="animate-pop-in mt-8 flex flex-col items-center gap-6">
          <p className="flex items-center gap-2 text-center font-display text-lg font-bold text-ink">
            <Sparkles className="h-5 w-5 text-sunshine-deep" aria-hidden />
            Thanks for voting! {result.totalVotes.toLocaleString()} votes so far in this matchup.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-8">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-ink-soft">React to {petA.name}</span>
              <ReactionBar petId={petA.id} matchupId={matchupId} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-ink-soft">React to {petB.name}</span>
              <ReactionBar petId={petB.id} matchupId={matchupId} />
            </div>
          </div>

          <ShareButtons
            url={`${siteUrl}/vote/${matchupId}`}
            title="Vote in Which Pet Shines?"
            text={`I just voted for ${votedForA ? petA.name : petB.name} in Which Pet Shines! Cast your vote:`}
          />

          <button
            type="button"
            onClick={nextMatchup}
            disabled={loadingNext}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-semibold text-white shadow-pop transition-transform active:scale-95 disabled:opacity-60"
          >
            {loadingNext ? "Finding a matchup…" : "Next matchup"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

function PetOption({
  pet,
  onVote,
  disabled,
  voted,
  showResult,
  percent,
  votes,
  isPending,
}: {
  pet: PetLite;
  onVote: () => void;
  disabled: boolean;
  voted: boolean;
  showResult: boolean;
  percent: number;
  votes: number;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onVote}
        disabled={disabled}
        aria-pressed={voted}
        aria-label={`Vote for ${pet.name}`}
        className={`group relative aspect-[3/4] w-full overflow-hidden rounded-3xl border-4 text-left shadow-soft transition-transform focus-visible:outline-offset-4 ${
          voted ? "border-mint" : "border-transparent"
        } ${!disabled ? "hover:scale-[1.02] active:scale-[0.98]" : ""}`}
      >
        <PetPhoto src={pet.photoUrl} alt={`${pet.name}, competing in Which Pet Shines?`} priority />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-10 sm:p-4 sm:pt-14">
          <p className="font-display text-lg font-extrabold text-white sm:text-2xl">{pet.name}</p>
          {pet.species && <p className="text-xs text-white/80 sm:text-sm">{pet.species}</p>}
        </div>
        {!showResult && !isPending && (
          <div className="absolute inset-x-3 top-3 rounded-full bg-white/90 py-1.5 text-center text-xs font-bold text-ink sm:text-sm">
            Tap to vote
          </div>
        )}
        {voted && (
          <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-mint text-white shadow-pop">
            ✓
          </div>
        )}
      </button>

      {showResult && (
        <div className="mt-3">
          <div className="h-3 w-full overflow-hidden rounded-full bg-cream-deep" role="img" aria-label={`${percent}%`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${voted ? "bg-mint" : "bg-ink-soft/50"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm font-bold text-ink">
            {percent}% <span className="font-normal text-ink-soft">· {votes.toLocaleString()} votes</span>
          </p>
        </div>
      )}
    </div>
  );
}
