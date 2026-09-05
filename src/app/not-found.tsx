import { ButtonLink } from "@/components/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="text-6xl" aria-hidden>
        🐾
      </span>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">Page not found</h1>
      <p className="mt-3 text-ink-soft">
        This page ran off chasing a squirrel. Let&apos;s get you back to the action.
      </p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/">Home</ButtonLink>
        <ButtonLink href="/vote" variant="outline">
          Vote now
        </ButtonLink>
      </div>
    </div>
  );
}
