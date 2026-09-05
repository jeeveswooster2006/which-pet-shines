import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/db/client";
import { verificationTokens, pets } from "@/db/schema";
import { ButtonLink } from "@/components/Button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirm your entry" };

type Params = Promise<{ token: string }>;

export default async function VerifyPage({ params }: { params: Params }) {
  const { token } = await params;

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.token, token));

  if (!row) {
    return (
      <Result
        ok={false}
        title="That link isn't valid"
        message="This confirmation link doesn't match any submission. Double-check the link from your email, or submit your pet again."
      />
    );
  }

  if (row.usedAt) {
    return (
      <Result
        ok={true}
        title="Already confirmed"
        message="This entry was already confirmed. It's in our review queue (or already competing) — thanks!"
      />
    );
  }

  if (row.expiresAt < new Date()) {
    return (
      <Result
        ok={false}
        title="This link has expired"
        message="Confirmation links expire after 48 hours. Please submit your pet again to get a fresh one."
      />
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(pets)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(pets.id, row.petId));
    await tx
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, row.id));
  });

  return (
    <Result
      ok={true}
      title="Entry confirmed! 🎉"
      message="Thanks for confirming! Your pet is now in our moderation queue — once approved, they'll be in the running for this week's bracket. Good luck!"
    />
  );
}

function Result({ ok, title, message }: { ok: boolean; title: string; message: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span
        className={`grid h-16 w-16 place-items-center rounded-full text-white shadow-pop ${
          ok ? "bg-mint" : "bg-coral-deep"
        }`}
      >
        {ok ? <CheckCircle2 className="h-8 w-8" aria-hidden /> : <XCircle className="h-8 w-8" aria-hidden />}
      </span>
      <h1 className="mt-6 font-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
      <p className="mt-3 text-ink-soft">{message}</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/">Back to home</ButtonLink>
        {!ok && (
          <ButtonLink href="/enter" variant="outline">
            Enter again
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
