import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trophy, Sparkles, Users } from "lucide-react";
import { PetPhoto } from "@/components/PetPhoto";
import { ShareButtons } from "@/components/ShareButtons";
import { ReactionBar } from "@/components/ReactionBar";
import { getPetBySlug, getReactionCounts } from "@/db/queries";
import { ROUND_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPetBySlug(slug);
  if (!data) return { title: "Pet not found" };
  const { pet } = data;
  const description = pet.description || `${pet.name}'s page on Which Pet Shines?`;
  return {
    title: pet.name,
    description,
    openGraph: {
      title: `${pet.name} | Which Pet Shines?`,
      description,
      images: [{ url: pet.photoUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${pet.name} | Which Pet Shines?`,
      description,
      images: [pet.photoUrl],
    },
  };
}

export default async function PetPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getPetBySlug(slug);
  if (!data) notFound();

  const { pet, matchups, totalVotes, awards } = data;
  const reactionCounts = await getReactionCounts(pet.id);
  const countsByEmoji = Object.fromEntries(reactionCounts.map((r) => [r.emoji, r.count]));

  const wins = matchups.filter((m) => m.winnerPetId === pet.id).length;
  const played = matchups.filter((m) => m.status === "COMPLETED").length;
  const champWins = awards.filter((a) => a.type === "WEEKLY_CHAMPION").length;
  const potmWins = awards.filter((a) => a.type === "POTM").length;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const pageUrl = `${siteUrl}/pet/${pet.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="aspect-[4/3] w-full sm:aspect-[16/9]">
          <PetPhoto src={pet.photoUrl} alt={pet.name} priority />
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">{pet.name}</h1>
              <p className="mt-1 text-ink-soft">
                {[pet.species, pet.age].filter(Boolean).join(" · ") || "Competitor"}
              </p>
            </div>
            <div className="flex gap-2">
              {champWins > 0 && <Badge tone="sunshine">👑 {champWins}x Champion</Badge>}
              {potmWins > 0 && <Badge tone="grape">🏅 {potmWins}x Pet of the Month</Badge>}
            </div>
          </div>

          {pet.description && <p className="mt-4 text-ink">{pet.description}</p>}

          <div className="mt-6">
            <ReactionBar petId={pet.id} initialCounts={countsByEmoji} />
          </div>

          <div className="mt-6">
            <ShareButtons url={pageUrl} title={`${pet.name} on Which Pet Shines?`} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <Stat icon={<Trophy className="h-5 w-5" aria-hidden />} label="Record" value={`${wins}-${played - wins}`} />
        <Stat icon={<Users className="h-5 w-5" aria-hidden />} label="Total votes" value={totalVotes.toLocaleString()} />
        <Stat icon={<Sparkles className="h-5 w-5" aria-hidden />} label="Awards" value={String(awards.length)} />
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl font-bold text-ink">Competition history</h2>
        {matchups.length === 0 ? (
          <p className="mt-3 text-ink-soft">No matchups yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {matchups.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                      {ROUND_LABELS[m.round]}
                    </p>
                    <p className="text-sm text-ink">
                      vs {m.opponent?.name ?? "TBD"}
                      {m.opponent && (
                        <>
                          {" "}
                          ·{" "}
                          <Link href={`/pet/${m.opponent.slug}`} className="underline">
                            view
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <ResultPill status={m.status} won={m.winnerPetId === pet.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "sunshine" | "grape"; children: React.ReactNode }) {
  const toneClass = tone === "sunshine" ? "bg-sunshine/40 text-ink" : "bg-grape/15 text-grape";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${toneClass}`}>{children}</span>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4 text-center shadow-soft">
      <span className="text-coral">{icon}</span>
      <span className="font-display text-lg font-extrabold text-ink">{value}</span>
      <span className="text-xs text-ink-soft">{label}</span>
    </div>
  );
}

function ResultPill({ status, won }: { status: string; won: boolean }) {
  if (status === "COMPLETED") {
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          won ? "bg-mint/20 text-mint-deep" : "bg-ink-soft/10 text-ink-soft"
        }`}
      >
        {won ? "Won" : "Lost"}
      </span>
    );
  }
  if (status === "LIVE" || status === "SUDDEN_DEATH") {
    return <span className="rounded-full bg-coral/15 px-3 py-1 text-xs font-bold text-coral-deep">Live</span>;
  }
  return <span className="rounded-full bg-ink-soft/10 px-3 py-1 text-xs font-bold text-ink-soft">Upcoming</span>;
}
