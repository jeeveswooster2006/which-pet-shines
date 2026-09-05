import Link from "next/link";
import { Trophy, Sparkles, Users, ArrowRight, Vote as VoteIcon } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import { PetPhoto } from "@/components/PetPhoto";
import {
  getCurrentTournament,
  getOpenSubmissionTournament,
  getEntryCountForTournament,
  getRoundProgress,
  getLastCompletedTournament,
  getCurrentPetOfTheMonthLeader,
  getHallOfFame,
} from "@/db/queries";
import { ROUND_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const [current, openSubs, lastChampion, potmLeader, hallOfFame] = await Promise.all([
    getCurrentTournament(),
    getOpenSubmissionTournament(),
    getLastCompletedTournament(),
    getCurrentPetOfTheMonthLeader(now.getUTCMonth() + 1, now.getUTCFullYear()),
    getHallOfFame(),
  ]);

  const progress = current?.currentRound
    ? await getRoundProgress(current.id, current.currentRound)
    : null;
  const openEntryCount = openSubs ? await getEntryCountForTournament(openSubs.id) : 0;

  return (
    <div>
      <Hero />

      <Section title="This Week's Tournament" icon={<VoteIcon className="h-6 w-6" aria-hidden />}>
        {current && progress ? (
          <div className="grid gap-6 sm:grid-cols-3">
            <Stat label="Current round" value={ROUND_LABELS[current.currentRound!]} />
            <Stat label="Pets competing" value={String(current.bracketSize ?? "—")} />
            <Stat
              label="Matchups live now"
              value={`${progress.live} live · ${progress.completed}/${progress.total} done`}
            />
          </div>
        ) : (
          <p className="text-ink-soft">
            No bracket in progress right now — check back Sunday when this week&apos;s Round of 64 kicks
            off. {openEntryCount > 0 && `${openEntryCount} pet${openEntryCount === 1 ? "" : "s"} already entered for next round.`}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/vote">Vote now</ButtonLink>
          <ButtonLink href="/bracket" variant="outline">
            View bracket <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </Section>

      {lastChampion?.champion && (
        <Section title="Last Week's Champion" icon={<Trophy className="h-6 w-6" aria-hidden />} tone="deep">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
            <Link
              href={`/pet/${lastChampion.champion.slug}`}
              className="block h-56 w-56 shrink-0 overflow-hidden rounded-3xl border-4 border-sunshine shadow-soft"
            >
              <PetPhoto src={lastChampion.champion.photoUrl} alt={lastChampion.champion.name} priority />
            </Link>
            <div className="flex flex-col justify-center text-center sm:text-left">
              <p className="text-sm font-bold uppercase tracking-wide text-sunshine-deep">
                👑 Weekly Champion
              </p>
              <h3 className="mt-1 font-display text-3xl font-extrabold text-ink">
                {lastChampion.champion.name}
              </h3>
              {lastChampion.champion.species && (
                <p className="text-ink-soft">{lastChampion.champion.species}</p>
              )}
              <div className="mt-4">
                <ButtonLink href={`/pet/${lastChampion.champion.slug}`} size="sm">
                  See {lastChampion.champion.name}&apos;s page
                </ButtonLink>
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section title="Pet of the Month" icon={<Sparkles className="h-6 w-6" aria-hidden />}>
        {potmLeader?.pet ? (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
            <Link
              href={`/pet/${potmLeader.pet.slug}`}
              className="block h-56 w-56 shrink-0 overflow-hidden rounded-3xl border-4 border-grape shadow-soft"
            >
              <PetPhoto src={potmLeader.pet.photoUrl} alt={potmLeader.pet.name} />
            </Link>
            <div className="flex flex-col justify-center text-center sm:text-left">
              <p className="text-sm font-bold uppercase tracking-wide text-grape">
                🏅 Leading this month
              </p>
              <h3 className="mt-1 font-display text-3xl font-extrabold text-ink">{potmLeader.pet.name}</h3>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-ink-soft sm:justify-start">
                <Users className="h-4 w-4" aria-hidden />
                {potmLeader.totalVotes.toLocaleString()} total votes this month
              </p>
              <div className="mt-4">
                <ButtonLink href="/pet-of-the-month" size="sm" variant="outline">
                  How Pet of the Month works
                </ButtonLink>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-ink-soft">
            Votes are still coming in — the pet with the most total votes this month wins the title.
          </p>
        )}
      </Section>

      <Section title="Hall of Fame" icon={<Trophy className="h-6 w-6" aria-hidden />} tone="deep">
        {hallOfFame.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {hallOfFame.slice(0, 4).map((entry) =>
              entry.pet ? (
                <Link
                  key={entry.id}
                  href={`/pet/${entry.pet.slug}`}
                  className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-center transition-colors hover:bg-cream"
                >
                  <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-border shadow-soft transition-transform group-hover:scale-105 sm:h-28 sm:w-28">
                    <PetPhoto src={entry.pet.photoUrl} alt={entry.pet.name} />
                  </div>
                  <p className="font-semibold text-ink">{entry.pet.name}</p>
                  <p className="text-xs text-ink-soft">
                    {entry.month}/{entry.year}
                  </p>
                </Link>
              ) : null
            )}
          </div>
        ) : (
          <p className="text-ink-soft">No Pet of the Month winners yet — be the first!</p>
        )}
        <div className="mt-6">
          <ButtonLink href="/hall-of-fame" variant="outline">
            See the full Hall of Fame <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </Section>
    </div>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-coral via-sunshine to-mint px-4 py-16 text-center sm:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden>
        <span className="absolute left-[8%] top-[15%] text-6xl">🐶</span>
        <span className="absolute right-[10%] top-[20%] text-6xl">🐱</span>
        <span className="absolute bottom-[12%] left-[15%] text-5xl">🐰</span>
        <span className="absolute bottom-[18%] right-[12%] text-5xl">🦜</span>
      </div>
      <div className="relative mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-extrabold text-white drop-shadow-sm sm:text-6xl">
          ✨ Which Pet Shines?
        </h1>
        <p className="mt-4 text-lg font-semibold text-white/95 drop-shadow-sm sm:text-2xl">
          Your pet. Their pet. You decide.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-white/90 sm:text-lg">
          A weekly knockout competition for real dogs, cats, rabbits, birds, and more. Vote in
          head-to-head matchups all week long — a new champion is crowned every Saturday.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href="/vote" size="lg" variant="secondary" className="bg-ink">
            Vote now
          </ButtonLink>
          <ButtonLink href="/enter" size="lg" className="bg-white text-ink hover:bg-white/90">
            Enter your pet
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  tone = "plain",
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone?: "plain" | "deep";
  children: React.ReactNode;
}) {
  return (
    <section className={`px-4 py-12 sm:py-16 ${tone === "deep" ? "bg-cream-deep/50" : ""}`}>
      <div className="mx-auto max-w-4xl">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
          <span className="text-coral">{icon}</span>
          {title}
        </h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold text-ink">{value}</p>
    </div>
  );
}
