import { NextResponse } from "next/server";
import { runSchedulerTick } from "@/lib/engine";

// Drives the entire weekly lifecycle: opening next week's submissions,
// closing submissions + generating the bracket, activating/resolving
// matchups (including sudden death), and advancing rounds through to a
// crowned champion. Call this on a schedule — see vercel.json (Vercel Cron)
// or .github/workflows/cron.yml (GitHub Actions) for two ready-made options.
// Every few minutes is plenty; nothing here is expensive, and every step is
// idempotent so an extra/overlapping call is harmless.
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  await runSchedulerTick(now);
  return NextResponse.json({ ok: true, ranAt: now.toISOString() });
}

export const GET = handle;
export const POST = handle;
