import { NextResponse } from "next/server";
import { computeAndApplyPetOfMonth } from "@/lib/engine";

// Scheduled for a few minutes after midnight UTC on the 1st of each month
// (see vercel.json / .github/workflows/cron.yml) — computes Pet of the
// Month for the month that just ended and files it permanently into the
// Hall of Fame (src/lib/engine.ts computeAndApplyPetOfMonth, which upserts
// so re-running for the same month is safe).
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Previous calendar month, in UTC.
  const prevMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const month = prevMonthDate.getUTCMonth() + 1;
  const year = prevMonthDate.getUTCFullYear();

  const winner = await computeAndApplyPetOfMonth(month, year);
  return NextResponse.json({ ok: true, month, year, winner });
}

export const GET = handle;
export const POST = handle;
