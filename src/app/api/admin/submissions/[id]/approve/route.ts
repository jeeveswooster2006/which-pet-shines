import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pets } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/adminAuth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [updated] = await db
    .update(pets)
    .set({ status: "APPROVED", rejectionReason: null, updatedAt: new Date() })
    .where(eq(pets.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, pet: updated });
}
