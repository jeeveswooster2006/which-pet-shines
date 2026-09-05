import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { ButtonLink } from "@/components/Button";

export const metadata: Metadata = { title: "Check your email" };

export default function ThankYouPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-mint text-white shadow-pop">
        <Mail className="h-8 w-8" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-2xl font-extrabold text-ink sm:text-3xl">
        Almost there — check your email!
      </h1>
      <p className="mt-3 text-ink-soft">
        We&apos;ve sent a confirmation link to the email address you entered. Click it to confirm your
        pet&apos;s entry — our team will then review it before it joins the bracket.
      </p>
      <div className="mt-8">
        <ButtonLink href="/">Back to home</ButtonLink>
      </div>
    </div>
  );
}
