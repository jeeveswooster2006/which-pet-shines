// Minimal signed-cookie session, no external auth library needed for a
// single admin user. HMAC-SHA256 over a base64url JSON payload; the browser
// cookie is `${payload}.${signature}`. Pure functions — unit tested — the
// actual cookie get/set lives in adminAuth.ts (which needs next/headers).

import { createHmac, timingSafeEqual } from "crypto";

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  /** unix seconds */
  exp: number;
}

function base64url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(payload).digest());
}

export function createSessionToken(
  payload: AdminSessionPayload,
  secret: string
): string {
  const json = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(json, secret);
  return `${json}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  secret: string
): AdminSessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [json, sig] = parts;

  const expectedSig = sign(json, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(json.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8"
      )
    ) as AdminSessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
