import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db/client";
import { pets, verificationTokens } from "@/db/schema";
import { petSubmissionSchema } from "@/lib/validation";
import { getStorageProvider } from "@/lib/storage";
import { generateUniqueSlug, guessLastName } from "@/lib/slug";
import { slugExists } from "@/db/queries";
import { ensureSubmissionWindow } from "@/lib/engine";
import { sendVerificationEmail } from "@/lib/email";
import { VERIFICATION_TOKEN_TTL_HOURS } from "@/lib/constants";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const parsed = petSubmissionSchema.safeParse({
      petName: form.get("petName"),
      species: form.get("species") ?? "",
      age: form.get("age") ?? "",
      description: form.get("description") ?? "",
      ownerName: form.get("ownerName") ?? "",
      ownerEmail: form.get("ownerEmail"),
      agreedToRules: form.get("agreedToRules"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
        { status: 400 }
      );
    }

    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ error: "A photo is required" }, { status: 400 });
    }

    const tournament = await ensureSubmissionWindow(new Date());
    if (tournament.status !== "SUBMISSIONS_OPEN") {
      return NextResponse.json(
        { error: "Submissions are not currently open. Please check back soon." },
        { status: 409 }
      );
    }

    const ownerEmail = parsed.data.ownerEmail.toLowerCase().trim();

    const existing = await db
      .select({ id: pets.id })
      .from(pets)
      .where(and(eq(pets.tournamentId, tournament.id), eq(pets.ownerEmail, ownerEmail)))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "You've already entered a pet in this week's tournament — one entry per person per week." },
        { status: 409 }
      );
    }

    let stored;
    try {
      stored = await getStorageProvider().savePhoto(photo);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not save photo" },
        { status: 400 }
      );
    }

    const slug = await generateUniqueSlug({
      name: parsed.data.petName,
      ownerLastName: guessLastName(parsed.data.ownerName),
      exists: slugExists,
    });

    const [pet] = await db
      .insert(pets)
      .values({
        name: parsed.data.petName,
        slug,
        photoUrl: stored.url,
        species: parsed.data.species || null,
        age: parsed.data.age || null,
        description: parsed.data.description || null,
        ownerEmail,
        ownerName: parsed.data.ownerName || null,
        agreedToRules: true,
        status: "PENDING",
        tournamentId: tournament.id,
      })
      .returning();

    const token = randomUUID();
    await db.insert(verificationTokens).values({
      petId: pet.id,
      token,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000),
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    await sendVerificationEmail({
      to: ownerEmail,
      petName: pet.name,
      verifyUrl: `${siteUrl}/verify/${token}`,
    });

    return NextResponse.json({ ok: true, petSlug: pet.slug });
  } catch (err) {
    console.error("submit error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
