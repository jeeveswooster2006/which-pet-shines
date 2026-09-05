"use client";

import { useState } from "react";
import { PetPhoto } from "@/components/PetPhoto";

interface PendingPet {
  id: string;
  name: string;
  slug: string;
  photoUrl: string;
  species: string | null;
  age: string | null;
  description: string | null;
  ownerEmail: string;
  ownerName: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export function AdminSubmissionsList({ initial }: { initial: PendingPet[] }) {
  const [pets, setPets] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/approve`, { method: "POST" });
      if (res.ok) setPets((p) => p.filter((pet) => pet.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejecting this submission (shown in our records only):");
    if (!reason) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) setPets((p) => p.filter((pet) => pet.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  if (pets.length === 0) {
    return <p className="text-ink-soft">No pending submissions — you&apos;re all caught up. 🎉</p>;
  }

  return (
    <ul className="space-y-4">
      {pets.map((pet) => (
        <li key={pet.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row">
          <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl border border-border sm:h-24 sm:w-24">
            <PetPhoto src={pet.photoUrl} alt={pet.name} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-bold text-ink">{pet.name}</p>
              {!pet.emailVerifiedAt && (
                <span className="rounded-full bg-coral/15 px-2 py-0.5 text-xs font-bold text-coral-deep">
                  Email not confirmed yet
                </span>
              )}
            </div>
            <p className="text-sm text-ink-soft">
              {[pet.species, pet.age].filter(Boolean).join(" · ") || "No species/age given"}
            </p>
            {pet.description && <p className="mt-1 text-sm text-ink">{pet.description}</p>}
            <p className="mt-1 text-xs text-ink-soft">
              {pet.ownerName ? `${pet.ownerName} · ` : ""}
              {pet.ownerEmail}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={busyId === pet.id}
              onClick={() => approve(pet.id)}
              className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busyId === pet.id}
              onClick={() => reject(pet.id)}
              className="rounded-full border-2 border-coral-deep px-4 py-2 text-sm font-semibold text-coral-deep disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
