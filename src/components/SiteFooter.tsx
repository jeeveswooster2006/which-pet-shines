import Link from "next/link";
import { PawPrint } from "lucide-react";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-cream-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <PawPrint className="h-5 w-5 text-coral" aria-hidden />
              {SITE_NAME}
            </div>
            <p className="mt-1 max-w-xs text-sm text-ink-soft">{SITE_TAGLINE}</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:flex sm:gap-10">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-ink">Compete</span>
              <Link href="/vote" className="text-ink-soft hover:text-coral">Vote</Link>
              <Link href="/enter" className="text-ink-soft hover:text-coral">Enter Your Pet</Link>
              <Link href="/bracket" className="text-ink-soft hover:text-coral">Bracket</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-ink">Celebrate</span>
              <Link href="/pet-of-the-month" className="text-ink-soft hover:text-coral">Pet of the Month</Link>
              <Link href="/hall-of-fame" className="text-ink-soft hover:text-coral">Hall of Fame</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-ink">Legal</span>
              <Link href="/rules" className="text-ink-soft hover:text-coral">Rules</Link>
              <Link href="/terms" className="text-ink-soft hover:text-coral">Terms</Link>
              <Link href="/privacy" className="text-ink-soft hover:text-coral">Privacy</Link>
              <Link href="/cookies" className="text-ink-soft hover:text-coral">Cookies</Link>
            </div>
          </nav>
        </div>

        <p className="mt-8 text-xs text-ink-soft">
          © {new Date().getFullYear()} {SITE_NAME}. Photos are shared by entrants, who keep ownership
          of them — see our <Link href="/rules" className="underline">Rules</Link> for details.
        </p>
      </div>
    </footer>
  );
}
