import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/adminAuth";
import { getPendingSubmissions, getAdminOverview } from "@/db/queries";
import { AdminSubmissionsList } from "@/components/AdminSubmissionsList";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { ROUND_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin dashboard", robots: { index: false, follow: false } };

export default async function AdminDashboardPage() {
  // Defense in depth: middleware.ts already blocks requests with no admin
  // cookie at all; this is the real signature+expiry check.
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const [pending, overview] = await Promise.all([getPendingSubmissions(), getAdminOverview()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Admin dashboard</h1>
          <p className="text-sm text-ink-soft">Signed in as {session.email}</p>
        </div>
        <AdminLogoutButton />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-ink">
          Pending submissions {overview.pendingCount > 0 && `(${overview.pendingCount})`}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Review each entry, then approve it into the bracket or reject it with a reason.
        </p>
        <div className="mt-5">
          <AdminSubmissionsList initial={pending} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-ink">Recent tournaments</h2>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-ink-soft">
                <th className="p-3 font-semibold">Week</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Bracket size</th>
                <th className="p-3 font-semibold">Current round</th>
                <th className="p-3 font-semibold">Champion</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentTournaments.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium text-ink">{t.weekLabel}</td>
                  <td className="p-3 text-ink-soft">{t.status}</td>
                  <td className="p-3 text-ink-soft">{t.bracketSize ?? "—"}</td>
                  <td className="p-3 text-ink-soft">{t.currentRound ? ROUND_LABELS[t.currentRound] : "—"}</td>
                  <td className="p-3 text-ink-soft">
                    {t.championPetId ? (
                      <Link href={`/bracket`} className="underline">
                        view
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-border bg-card p-5 text-sm text-ink-soft shadow-soft">
        <p className="font-semibold text-ink">Automation status</p>
        <p className="mt-1">
          Submission closing, bracket generation, round progression, sudden death, and Pet of the Month
          all run automatically via the scheduled jobs at <code>/api/cron/tick</code> and{" "}
          <code>/api/cron/pet-of-month</code>. Make sure your host is calling them on a schedule — see
          README.md.
        </p>
      </section>
    </div>
  );
}
