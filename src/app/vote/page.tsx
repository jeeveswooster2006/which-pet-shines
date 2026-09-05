import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRandomLiveMatchup } from "@/db/queries";
import { ButtonLink } from "@/components/Button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vote",
  description: "Vote in this week's head-to-head pet matchups.",
};

export default async function VotePage() {
  const matchup = await getRandomLiveMatchup();

  if (!matchup) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <span className="text-5xl" aria-hidden>
          🐾
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">No live matchup right now</h1>
        <p className="mt-3 text-ink-soft">
          Voting rounds run Sunday through Friday, 24 hours per round. Check the bracket to see what&apos;s
          coming up, or enter your own pet for next week.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/bracket">View bracket</ButtonLink>
          <ButtonLink href="/enter" variant="outline">
            Enter your pet
          </ButtonLink>
        </div>
        <p className="mt-8 text-sm text-ink-soft">
          Missed the action? Catch up on the <Link href="/hall-of-fame" className="underline">Hall of Fame</Link>.
        </p>
      </div>
    );
  }

  redirect(`/vote/${matchup.id}`);
}
