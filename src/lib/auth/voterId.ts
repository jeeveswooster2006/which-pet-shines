import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { VOTER_COOKIE_NAME } from "@/lib/constants";

const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

/**
 * MVP duplicate-vote / duplicate-reaction prevention: a random id stored in
 * a long-lived first-party cookie. Not fraud-proof (a user can clear cookies
 * or use another browser) but is exactly the "basic" bar the spec asks for,
 * and it never requires an account. The unique DB constraint on
 * (matchupId, voterId, phase) is the actual enforcement point.
 */
export async function getOrCreateVoterId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(VOTER_COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = randomUUID();
  store.set(VOTER_COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VOTER_COOKIE_MAX_AGE,
  });
  return id;
}

/**
 * Read-only lookup, safe to call from a Server Component (which — unlike a
 * Route Handler or Server Action — is not allowed to write cookies). If
 * there's no cookie yet, the visitor simply hasn't voted on anything yet;
 * the cookie itself gets created the moment they cast their first vote, via
 * getOrCreateVoterId() inside the /api/vote route handler.
 */
export async function peekVoterId(): Promise<string | null> {
  const store = await cookies();
  return store.get(VOTER_COOKIE_NAME)?.value ?? null;
}
