"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { SPECIES_OPTIONS } from "@/lib/constants";

export function EnterPetForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch("/api/pets/submit", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push("/enter/thank-you");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Field label="Pet's name" htmlFor="petName" required>
        <input
          id="petName"
          name="petName"
          type="text"
          required
          maxLength={60}
          placeholder="e.g. Bella"
          className={inputClass}
        />
      </Field>

      <div>
        <label htmlFor="photo" className="mb-1.5 block text-sm font-semibold text-ink">
          Photo <span className="text-coral-deep">*</span>
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          required
          onChange={handlePhotoChange}
          className="block w-full rounded-2xl border-2 border-dashed border-border bg-card p-4 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-coral file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        <p className="mt-1 text-xs text-ink-soft">JPEG, PNG, WebP, or GIF, up to 8MB.</p>
        {photoPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview}
            alt="Preview of your uploaded photo"
            className="mt-3 h-40 w-40 rounded-2xl border border-border object-cover shadow-soft"
          />
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Species / type" htmlFor="species">
          <select id="species" name="species" defaultValue="" className={inputClass}>
            <option value="">Prefer not to say</option>
            {SPECIES_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Age" htmlFor="age">
          <input id="age" name="age" type="text" maxLength={30} placeholder="e.g. 2 years" className={inputClass} />
        </Field>
      </div>

      <Field label="Short description" htmlFor="description">
        <textarea
          id="description"
          name="description"
          maxLength={600}
          rows={3}
          placeholder="What makes them shine? (optional, up to 600 characters)"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name" htmlFor="ownerName">
          <input id="ownerName" name="ownerName" type="text" maxLength={80} className={inputClass} />
        </Field>
        <Field label="Your email" htmlFor="ownerEmail" required>
          <input id="ownerEmail" name="ownerEmail" type="email" required className={inputClass} />
        </Field>
      </div>
      <p className="-mt-4 text-xs text-ink-soft">
        We&apos;ll send a confirmation link to this address — one entry per person per weekly
        tournament, verified by email.
      </p>

      <label className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <input name="agreedToRules" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 rounded" />
        <span>
          I confirm that I own or care for this pet, that I have permission to submit this photograph,
          that the content is appropriate, and I agree to the{" "}
          <a href="/rules" target="_blank" className="underline">
            competition rules
          </a>
          , including that I retain ownership of my photo but grant Which Pet Shines? permission to
          display and use it for the competition and promotional purposes.
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-2xl bg-coral/10 p-3 text-sm font-semibold text-coral-deep">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-coral px-6 py-4 text-base font-bold text-white shadow-pop transition-transform active:scale-[0.98] disabled:opacity-60 sm:w-auto"
      >
        {submitting ? "Submitting…" : "Enter your pet"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-coral";

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label} {required && <span className="text-coral-deep">*</span>}
      </label>
      {children}
    </div>
  );
}
