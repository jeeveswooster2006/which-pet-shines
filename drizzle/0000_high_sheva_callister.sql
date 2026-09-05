CREATE TYPE "public"."award_type" AS ENUM('WEEKLY_CHAMPION', 'POTM');--> statement-breakpoint
CREATE TYPE "public"."matchup_status" AS ENUM('SCHEDULED', 'LIVE', 'SUDDEN_DEATH', 'COMPLETED', 'BYE');--> statement-breakpoint
CREATE TYPE "public"."pet_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."round" AS ENUM('ROUND_64', 'ROUND_32', 'ROUND_16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('SUBMISSIONS_OPEN', 'BRACKET_PENDING', 'ROUND_64', 'ROUND_32', 'ROUND_16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL', 'COMPLETED', 'CANCELLED_NOT_ENOUGH_ENTRIES');--> statement-breakpoint
CREATE TYPE "public"."vote_phase" AS ENUM('REGULAR', 'SUDDEN_DEATH');--> statement-breakpoint
CREATE TYPE "public"."winner_method" AS ENUM('VOTES', 'SUDDEN_DEATH_VOTES', 'RANDOM_TIE_BREAK', 'BYE');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "awards" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "award_type" NOT NULL,
	"pet_id" text NOT NULL,
	"tournament_id" text,
	"month" integer,
	"year" integer,
	"total_votes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"seed" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_pet_id_unique" UNIQUE("pet_id")
);
--> statement-breakpoint
CREATE TABLE "matchups" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"round" "round" NOT NULL,
	"position" integer NOT NULL,
	"pet_a_id" text,
	"pet_b_id" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"status" "matchup_status" DEFAULT 'SCHEDULED' NOT NULL,
	"winner_pet_id" text,
	"winner_method" "winner_method",
	"sudden_death_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"photo_url" text NOT NULL,
	"species" text,
	"age" text,
	"description" text,
	"owner_email" text NOT NULL,
	"owner_name" text,
	"status" "pet_status" DEFAULT 'PENDING' NOT NULL,
	"rejection_reason" text,
	"agreed_to_rules" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"tournament_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"pet_id" text NOT NULL,
	"matchup_id" text,
	"emoji" text NOT NULL,
	"anon_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"week_label" text NOT NULL,
	"submissions_open_at" timestamp with time zone NOT NULL,
	"submissions_close_at" timestamp with time zone NOT NULL,
	"status" "tournament_status" DEFAULT 'SUBMISSIONS_OPEN' NOT NULL,
	"bracket_size" integer,
	"current_round" "round",
	"champion_pet_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_week_label_unique" UNIQUE("week_label")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"pet_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_pet_id_unique" UNIQUE("pet_id"),
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" text PRIMARY KEY NOT NULL,
	"matchup_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"voter_id" text NOT NULL,
	"phase" "vote_phase" DEFAULT 'REGULAR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_pet_a_id_pets_id_fk" FOREIGN KEY ("pet_a_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_pet_b_id_pets_id_fk" FOREIGN KEY ("pet_b_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_winner_pet_id_pets_id_fk" FOREIGN KEY ("winner_pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_matchup_id_matchups_id_fk" FOREIGN KEY ("matchup_id") REFERENCES "public"."matchups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_matchup_id_matchups_id_fk" FOREIGN KEY ("matchup_id") REFERENCES "public"."matchups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "awards_type_month_year_uq" ON "awards" USING btree ("type","month","year");--> statement-breakpoint
CREATE UNIQUE INDEX "entries_tournament_seed_uq" ON "entries" USING btree ("tournament_id","seed");--> statement-breakpoint
CREATE UNIQUE INDEX "matchups_tournament_round_position_uq" ON "matchups" USING btree ("tournament_id","round","position");--> statement-breakpoint
CREATE INDEX "matchups_status_idx" ON "matchups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "matchups_tournament_round_idx" ON "matchups" USING btree ("tournament_id","round");--> statement-breakpoint
CREATE UNIQUE INDEX "pets_tournament_owner_email_uq" ON "pets" USING btree ("tournament_id","owner_email");--> statement-breakpoint
CREATE INDEX "pets_status_idx" ON "pets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pets_tournament_idx" ON "pets" USING btree ("tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_pet_anon_emoji_uq" ON "reactions" USING btree ("pet_id","anon_id","emoji");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_matchup_voter_phase_uq" ON "votes" USING btree ("matchup_id","voter_id","phase");--> statement-breakpoint
CREATE INDEX "votes_pet_idx" ON "votes" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX "votes_matchup_idx" ON "votes" USING btree ("matchup_id");