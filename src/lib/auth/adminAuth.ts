import "server-only";
import { cookies } from "next/headers";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { adminUsers } from "@/db/schema";
import { ADMIN_COOKIE_NAME } from "@/lib/constants";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

export async function verifyAdminCredentials(email: string, password: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.toLowerCase().trim()))
    .limit(1);
  if (!admin) return null;
  const ok = await compare(password, admin.passwordHash);
  return ok ? admin : null;
}

export async function createAdminSession(adminId: string, email: string) {
  const token = createSessionToken(
    { adminId, email, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS },
    secret()
  );
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}

/** Returns the verified session payload, or null if not logged in / expired / tampered. */
export async function getAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionToken(token, secret());
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
