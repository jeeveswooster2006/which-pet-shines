import type { Metadata } from "next";
import Link from "next/link";
import { PetPhoto } from "@/components/PetPhoto";
import { getHallOfFame } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Hall of Fame",
  description: "Every Pet of the Month winner, chronologically.",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function HallOfFamePage() {
  const entries = await getHallOfFame();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">🏛️ Hall of Fame</h1>
        <p className="mt-2 text-ink-soft">Every Pet of the Month winner, ever.</p>
      </div>

      {entries.length === 0 ? (
        <p className="mt-10 text-center text-ink-soft">
          No Pet of the Month winners yet — the first one is crowned at the end of this month.
        </p>
      ) : (
        <ol className="mt-10 space-y-4">
          {entries.map((entry) =>
            entry.pet ? (
              <li key={entry.id}>
                <Link
                  href={`/pet/${entry.pet.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-transform hover:scale-[1.01]"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border">
                    <PetPhoto src={entry.pet.photoUrl} alt={entry.pet.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-grape">
                      {MONTH_NAMES[(entry.month ?? 1) - 1]} {entry.year}
                    </p>
                    <p className="truncate font-display text-lg font-extrabold text-ink">{entry.pet.name}</p>
                    <p className="text-sm text-ink-soft">{entry.totalVotes?.toLocaleString()} total votes</p>
                  </div>
                  <span className="text-2xl" aria-hidden>
                    🏅
                  </span>
                </Link>
              </li>
            ) : null
          )}
        </ol>
      )}
    </div>
  );
}
