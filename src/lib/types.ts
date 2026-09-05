// Shared literal/enum types, mirrored from the Postgres enums in src/db/schema.ts.
// Kept as plain string unions (rather than importing generated DB types
// everywhere) so pure logic in src/lib can be unit-tested with zero DB setup.

export type PetStatus = "PENDING" | "APPROVED" | "REJECTED";

export type TournamentStatus =
  | "SUBMISSIONS_OPEN"
  | "BRACKET_PENDING"
  | "ROUND_64"
  | "ROUND_32"
  | "ROUND_16"
  | "QUARTERFINAL"
  | "SEMIFINAL"
  | "FINAL"
  | "COMPLETED"
  | "CANCELLED_NOT_ENOUGH_ENTRIES";

export type Round =
  | "ROUND_64"
  | "ROUND_32"
  | "ROUND_16"
  | "QUARTERFINAL"
  | "SEMIFINAL"
  | "FINAL";

export type MatchupStatus =
  | "SCHEDULED"
  | "LIVE"
  | "SUDDEN_DEATH"
  | "COMPLETED"
  | "BYE";

export type WinnerMethod =
  | "VOTES"
  | "SUDDEN_DEATH_VOTES"
  | "RANDOM_TIE_BREAK"
  | "BYE";

export type VotePhase = "REGULAR" | "SUDDEN_DEATH";

export type AwardType = "WEEKLY_CHAMPION" | "POTM";
