import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Info } from "lucide-react";
import { PetPhoto } from "@/components/PetPhoto";
import { ButtonLink } from "@/components/Button";
import { getCurrentPetOfTheMonthLeader, getHallOfFame } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pet of the Month",
  description: "The pet with the most total votes this month — not necessarily the weekly champion.",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function PetOfTheMonthPage() {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const [leader, hallOfFame] = await Promise.all([
    getCurrentPetOfTheMonthLeader(month, year),
    getHallOfFame(),
  ]);

  const lastMonthEntry = hallOfFame.find((e) => !(e.month === month && e.year === year));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
          🏅 Pet of the Month
        </h1>
        <p className="mt-2 text-ink-soft">
          {MONTH_NAMES[month - 1]} {year}
        </p>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-grape/30 bg-grape/5 p-4 text-sm text-ink-soft">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-grape" aria-hidden />
        <p>
          Pet of the Month is <strong className="text-ink">not</strong> the same as a weekly champion. It
          goes to whichever pet earns the highest <strong className="text-ink">total number of votes</strong>{" "}
          across all of its matchups this month — win or lose. A pet that loses every matchup but pulls in
          huge crowds can still take the title.
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-soft">
        {leader?.pet ? (
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <Link
              href={`/pet/${leader.pet.slug}`}
              className="block h-40 w-40 shrink-0 overflow-hidden rounded-3xl border-4 border-grape shadow-soft"
            >
              <PetPhoto src={leader.pet.photoUrl} alt={leader.pet.name} priority />
            </Link>
            <div>
              <p className="flex items-center justify-center gap-1.5 text-sm font-bold uppercase tracking-wide text-grape sm:justify-start">
                <Sparkles className="h-4 w-4" aria-hidden /> Currently leading
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-ink">{leader.pet.name}</h2>
              <p className="mt-1 text-ink-soft">{leader.totalVotes.toLocaleString()} total votes so far this month</p>
              <div className="mt-4">
                <ButtonLink href={`/pet/${leader.pet.slug}`} size="sm">
                  View {leader.pet.name}&apos;s page
                </ButtonLink>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-ink-soft">No votes yet this month — get voting!</p>
        )}
      </div>

      {lastMonthEntry?.pet && (
        <div className="mt-8">
          <h3 className="font-display text-lg font-bold text-ink">
            {MONTH_NAMES[(lastMonthEntry.month ?? 1) - 1]} {lastMonthEntry.year} winner
          </h3>
          <Link
            href={`/pet/${lastMonthEntry.pet.slug}`}
            className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition-colors hover:bg-cream-deep"
          >
            <div className="h-14 w-14 overflow-hidden rounded-full border border-border">
              <PetPhoto src={lastMonthEntry.pet.photoUrl} alt={lastMonthEntry.pet.name} />
            </div>
            <div>
              <p className="font-semibold text-ink">{lastMonthEntry.pet.name}</p>
              <p className="text-xs text-ink-soft">{lastMonthEntry.totalVotes?.toLocaleString()} total votes</p>
            </div>
          </Link>
        </div>
      )}

      <div className="mt-10 text-center">
        <ButtonLink href="/hall-of-fame" variant="outline">
          See every Pet of the Month in the Hall of Fame
        </ButtonLink>
      </div>
    </div>
  );
}
