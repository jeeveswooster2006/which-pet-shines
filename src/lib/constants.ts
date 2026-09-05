import type { Round } from "@/lib/types";

export const SITE_NAME = "Which Pet Shines?";
export const SITE_TAGLINE = "Your pet. Their pet. You decide.";

export const MAX_BRACKET_SIZE = 64;

// Every entry into the bracket must be a power of two, from the table in the
// product spec. Sizes are checked largest-first in bracketSizeFor().
export const BRACKET_SIZES = [64, 32, 16, 8, 4, 2] as const;

export const ROUND_HOURS = 24;

// Ordered rounds for a full 64-pet bracket. A smaller bracket just starts
// further down this list (e.g. an 8-pet bracket starts at QUARTERFINAL).
export const ROUND_ORDER: Round[] = [
  "ROUND_64",
  "ROUND_32",
  "ROUND_16",
  "QUARTERFINAL",
  "SEMIFINAL",
  "FINAL",
];

export const ROUND_LABELS: Record<Round, string> = {
  ROUND_64: "Round of 64",
  ROUND_32: "Round of 32",
  ROUND_16: "Round of 16",
  QUARTERFINAL: "Quarter-final",
  SEMIFINAL: "Semi-final",
  FINAL: "Final",
};

export const SUDDEN_DEATH_HOURS = 1;

export const SPECIES_OPTIONS = [
  "Dog",
  "Cat",
  "Bird",
  "Rabbit",
  "Reptile",
  "Hamster",
  "Guinea Pig",
  "Other",
] as const;

export const REACTION_EMOJIS = ["❤️", "🥰", "😂", "😍", "🔥"] as const;

export const VOTER_COOKIE_NAME = "wps_voter";
export const ADMIN_COOKIE_NAME = "wps_admin_session";

export const VERIFICATION_TOKEN_TTL_HOURS = 48;
