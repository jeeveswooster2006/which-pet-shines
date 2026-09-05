// Which Pet Shines? — data model (Drizzle ORM / PostgreSQL)
//
// Chosen over Prisma for this project because Drizzle + node-postgres are pure
// JS/TypeScript with no native engine binaries to download — simpler to host
// anywhere, including restricted/offline build environments. See README.md.

import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

// ---------- Enums ----------

export const petStatusEnum = pgEnum("pet_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const tournamentStatusEnum = pgEnum("tournament_status", [
  "SUBMISSIONS_OPEN",
  "BRACKET_PENDING",
  "ROUND_64",
  "ROUND_32",
  "ROUND_16",
  "QUARTERFINAL",
  "SEMIFINAL",
  "FINAL",
  "COMPLETED",
  "CANCELLED_NOT_ENOUGH_ENTRIES",
]);

export const roundEnum = pgEnum("round", [
  "ROUND_64",
  "ROUND_32",
  "ROUND_16",
  "QUARTERFINAL",
  "SEMIFINAL",
  "FINAL",
]);

export const matchupStatusEnum = pgEnum("matchup_status", [
  "SCHEDULED",
  "LIVE",
  "SUDDEN_DEATH",
  "COMPLETED",
  "BYE",
]);

export const winnerMethodEnum = pgEnum("winner_method", [
  "VOTES",
  "SUDDEN_DEATH_VOTES",
  "RANDOM_TIE_BREAK",
  "BYE",
]);

export const votePhaseEnum = pgEnum("vote_phase", ["REGULAR", "SUDDEN_DEATH"]);

export const awardTypeEnum = pgEnum("award_type", [
  "WEEKLY_CHAMPION",
  "POTM",
]);

// ---------- Tournaments ----------

export const tournaments = pgTable("tournaments", {
  id: id(),
  weekLabel: text("week_label").notNull().unique(),
  submissionsOpenAt: timestamp("submissions_open_at", {
    withTimezone: true,
  }).notNull(),
  submissionsCloseAt: timestamp("submissions_close_at", {
    withTimezone: true,
  }).notNull(),
  status: tournamentStatusEnum("status").notNull().default("SUBMISSIONS_OPEN"),
  bracketSize: integer("bracket_size"),
  currentRound: roundEnum("current_round"),
  championPetId: text("champion_pet_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------- Pets & submissions ----------

export const pets = pgTable(
  "pets",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    photoUrl: text("photo_url").notNull(),
    species: text("species"),
    age: text("age"),
    description: text("description"),
    ownerEmail: text("owner_email").notNull(),
    ownerName: text("owner_name"),
    status: petStatusEnum("status").notNull().default("PENDING"),
    rejectionReason: text("rejection_reason"),
    agreedToRules: boolean("agreed_to_rules").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One pet-entry per person per weekly tournament.
    uniqueIndex("pets_tournament_owner_email_uq").on(
      t.tournamentId,
      t.ownerEmail
    ),
    index("pets_status_idx").on(t.status),
    index("pets_tournament_idx").on(t.tournamentId),
  ]
);

export const verificationTokens = pgTable("verification_tokens", {
  id: id(),
  petId: text("pet_id")
    .notNull()
    .unique()
    .references(() => pets.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A pet actually selected into this week's bracket (post random-selection if oversubscribed).
export const entries = pgTable(
  "entries",
  {
    id: id(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    petId: text("pet_id")
      .notNull()
      .unique()
      .references(() => pets.id),
    seed: integer("seed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("entries_tournament_seed_uq").on(t.tournamentId, t.seed),
  ]
);

// ---------- Matchups & voting ----------

export const matchups = pgTable(
  "matchups",
  {
    id: id(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    round: roundEnum("round").notNull(),
    position: integer("position").notNull(),
    petAId: text("pet_a_id").references(() => pets.id),
    petBId: text("pet_b_id").references(() => pets.id),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    status: matchupStatusEnum("status").notNull().default("SCHEDULED"),
    winnerPetId: text("winner_pet_id").references(() => pets.id),
    winnerMethod: winnerMethodEnum("winner_method"),
    suddenDeathEndsAt: timestamp("sudden_death_ends_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("matchups_tournament_round_position_uq").on(
      t.tournamentId,
      t.round,
      t.position
    ),
    index("matchups_status_idx").on(t.status),
    index("matchups_tournament_round_idx").on(t.tournamentId, t.round),
  ]
);

export const votes = pgTable(
  "votes",
  {
    id: id(),
    matchupId: text("matchup_id")
      .notNull()
      .references(() => matchups.id),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id),
    voterId: text("voter_id").notNull(),
    phase: votePhaseEnum("phase").notNull().default("REGULAR"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One vote per voter per matchup per phase — sudden death is a fresh voting window.
    uniqueIndex("votes_matchup_voter_phase_uq").on(
      t.matchupId,
      t.voterId,
      t.phase
    ),
    index("votes_pet_idx").on(t.petId),
    index("votes_matchup_idx").on(t.matchupId),
  ]
);

// ---------- Reactions (never affect tournament outcome) ----------

export const reactions = pgTable(
  "reactions",
  {
    id: id(),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id),
    matchupId: text("matchup_id").references(() => matchups.id),
    emoji: text("emoji").notNull(),
    anonId: text("anon_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("reactions_pet_anon_emoji_uq").on(
      t.petId,
      t.anonId,
      t.emoji
    ),
  ]
);

// ---------- Awards & Hall of Fame ----------

export const awards = pgTable(
  "awards",
  {
    id: id(),
    type: awardTypeEnum("type").notNull(),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id),
    tournamentId: text("tournament_id").references(() => tournaments.id),
    month: integer("month"), // 1-12, POTM only
    year: integer("year"), // POTM only
    totalVotes: integer("total_votes"), // POTM only
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One Pet of the Month per calendar month (and, incidentally, one champion row per (tournament) via app logic).
    uniqueIndex("awards_type_month_year_uq").on(t.type, t.month, t.year),
  ]
);

// ---------- Admin ----------

export const adminUsers = pgTable("admin_users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------- Relations (for ergonomic query.with{...}) ----------

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  pets: many(pets),
  entries: many(entries),
  matchups: many(matchups),
  awards: many(awards),
}));

export const petsRelations = relations(pets, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [pets.tournamentId],
    references: [tournaments.id],
  }),
  entry: one(entries, {
    fields: [pets.id],
    references: [entries.petId],
  }),
  votesReceived: many(votes),
  reactions: many(reactions),
  awards: many(awards),
  verification: one(verificationTokens, {
    fields: [pets.id],
    references: [verificationTokens.petId],
  }),
}));

export const entriesRelations = relations(entries, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [entries.tournamentId],
    references: [tournaments.id],
  }),
  pet: one(pets, { fields: [entries.petId], references: [pets.id] }),
}));

export const matchupsRelations = relations(matchups, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [matchups.tournamentId],
    references: [tournaments.id],
  }),
  petA: one(pets, { fields: [matchups.petAId], references: [pets.id] }),
  petB: one(pets, { fields: [matchups.petBId], references: [pets.id] }),
  winner: one(pets, {
    fields: [matchups.winnerPetId],
    references: [pets.id],
  }),
  votes: many(votes),
  reactions: many(reactions),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  matchup: one(matchups, {
    fields: [votes.matchupId],
    references: [matchups.id],
  }),
  pet: one(pets, { fields: [votes.petId], references: [pets.id] }),
}));

export const awardsRelations = relations(awards, ({ one }) => ({
  pet: one(pets, { fields: [awards.petId], references: [pets.id] }),
  tournament: one(tournaments, {
    fields: [awards.tournamentId],
    references: [tournaments.id],
  }),
}));

export type Pet = typeof pets.$inferSelect;
export type NewPet = typeof pets.$inferInsert;
export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
export type Entry = typeof entries.$inferSelect;
export type Matchup = typeof matchups.$inferSelect;
export type NewMatchup = typeof matchups.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
export type Award = typeof awards.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
