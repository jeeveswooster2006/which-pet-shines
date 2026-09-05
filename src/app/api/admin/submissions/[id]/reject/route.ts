import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pets } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { rejectSubmissionSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = rejectSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const { id } = await params;
  const [updated] = await db
    .update(pets)
    .set({ status: "REJECTED", rejectionReason: parsed.data.reason, updatedAt: new Date() })
    .where(eq(pets.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, pet: updated });
}
