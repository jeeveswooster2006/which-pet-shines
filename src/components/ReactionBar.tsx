"use client";

import { useState } from "react";
import { REACTION_EMOJIS } from "@/lib/constants";

interface ReactionBarProps {
  petId: string;
  matchupId?: string;
  initialCounts?: Record<string, number>;
}

// Purely for fun — these never influence who wins a matchup or the
// tournament. See src/lib/engine.ts, which only ever reads from `votes`.
export function ReactionBar({ petId, matchupId, initialCounts = {} }: ReactionBarProps) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [justSent, setJustSent] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function react(emoji: string) {
    if (pending) return;
    setPending(true);
    setJustSent(emoji);
    // Optimistic bump so it feels instant.
    setCounts((c) => ({ ...c, [emoji]: (c[emoji] ?? 0) + 1 }));
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, matchupId, emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        const byEmoji: Record<string, number> = {};
        for (const row of data.counts as { emoji: string; count: number }[]) {
          byEmoji[row.emoji] = row.count;
        }
        setCounts(byEmoji);
      }
    } catch {
      // Non-critical — leave the optimistic count in place.
    } finally {
      setPending(false);
      setTimeout(() => setJustSent(null), 600);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="React to this pet">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => react(emoji)}
          aria-label={`React with ${emoji}`}
          className={`flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1.5 text-base transition-transform hover:scale-110 active:scale-95 ${
            justSent === emoji ? "animate-pop-in" : ""
          }`}
        >
          <span aria-hidden>{emoji}</span>
          {!!counts[emoji] && <span className="text-xs font-semibold text-ink-soft">{counts[emoji]}</span>}
        </button>
      ))}
    </div>
  );
}
