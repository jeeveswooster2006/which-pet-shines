/**
 * Direct-DB cron entry point, for self-hosted deployments that run their own
 * OS-level scheduler (e.g. a VPS with cron/systemd timers) instead of an HTTP
 * platform-cron. Runs the exact same `runSchedulerTick` used by
 * /api/cron/tick, just without going through HTTP or CRON_SECRET.
 *
 * Usage: `npm run cron:tick` (see package.json), on a schedule of your
 * choosing (every few minutes is plenty — every step is idempotent, so an
 * overlapping run is harmless).
 *
 * If you're deploying to Vercel or another platform that offers scheduled
 * HTTP invocations, prefer that instead: see vercel.json (Vercel Cron) or
 * .github/workflows/cron.yml (GitHub Actions), both of which call
 * /api/cron/tick over HTTP and don't need direct DB access from the runner.
 */
import "dotenv/config";
import { runSchedulerTick } from "@/lib/engine";
import { pool } from "@/db/client";

async function main() {
  const now = new Date();
  console.log(`[cron:tick] running at ${now.toISOString()}`);
  await runSchedulerTick(now);
  console.log("[cron:tick] done");
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("[cron:tick] failed:", err);
  process.exit(1);
});
