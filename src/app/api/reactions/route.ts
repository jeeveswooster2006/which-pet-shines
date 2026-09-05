import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { reactions } from "@/db/schema";
import { reactionSchema } from "@/lib/validation";
import { getReactionCounts } from "@/db/queries";

const REACTION_COOKIE = "wps_reactor";

async function getReactorId() {
  const store = await cookies();
  const existing = store.get(REACTION_COOKIE)?.value;
  if (existing) return existing;
  const id = randomUUID();
  store.set(REACTION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
  return id;
}

// Reactions are purely for fun (❤️ 🥰 😂 😍 🔥) and NEVER affect who wins —
// see src/lib/engine.ts, which only ever reads from the `votes` table.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  const anonId = await getReactorId();

  await db
    .insert(reactions)
    .values({
      petId: parsed.data.petId,
      matchupId: parsed.data.matchupId ?? null,
      emoji: parsed.data.emoji,
      anonId,
    })
    .onConflictDoNothing();

  const counts = await getReactionCounts(parsed.data.petId);
  return NextResponse.json({ ok: true, counts });
}
