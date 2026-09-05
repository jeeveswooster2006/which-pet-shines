import type { Metadata } from "next";
import { EnterPetForm } from "@/components/EnterPetForm";

export const metadata: Metadata = {
  title: "Enter Your Pet",
  description: "Enter your pet in this week's Which Pet Shines? tournament.",
};

export default function EnterPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">Enter your pet 🐾</h1>
      <p className="mt-3 text-ink-soft">
        Submissions are open Monday through Saturday for the following Sunday&apos;s bracket. One entry
        per person per week — we&apos;ll email you a link to confirm.
      </p>
      <div className="mt-8">
        <EnterPetForm />
      </div>
    </div>
  );
}
