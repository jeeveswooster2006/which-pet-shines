import { NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validation";
import { verifyAdminCredentials, createAdminSession } from "@/lib/auth/adminAuth";

// Deliberately generic errors + a small delay-free constant-time password
// check (bcrypt.compare) so this doesn't leak which part was wrong, and a
// single admin account rather than open registration — see README "Admin
// security" section.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  const admin = await verifyAdminCredentials(parsed.data.email, parsed.data.password);
  if (!admin) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createAdminSession(admin.id, admin.email);
  return NextResponse.json({ ok: true });
}
