import "dotenv/config";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { adminUsers, pets, tournaments } from "@/db/schema";
import { scheduleForRound64Sunday, onOrBeforeSunday } from "@/lib/schedule";
import { addDays } from "date-fns";
import {
  ensureSubmissionWindow,
  closeSubmissionsAndGenerateBrackets,
  progressLiveMatchups,
  advanceRoundsIfComplete,
  computeAndApplyPetOfMonth,
} from "@/lib/engine";
import { roundPathForSize } from "@/lib/bracket";
import { matchups as matchupsTable, votes as votesTable } from "@/db/schema";
import { and, eq as eqOp } from "drizzle-orm";

const DEMO_PETS = [
  { name: "Bella", species: "Dog", age: "3 years", photo: "bella-retriever.svg", desc: "A golden retriever who thinks every ball throw is the best moment of her life." },
  { name: "Max", species: "Dog", age: "2 years", photo: "max-terrier.svg", desc: "Small terrier, enormous opinions, especially about the mail carrier." },
  { name: "Mochi", species: "Cat", age: "1 year", photo: "mochi-tabby.svg", desc: "Professional windowsill supervisor and part-time lap warmer." },
  { name: "Luna", species: "Cat", age: "4 years", photo: "luna-siamese.svg", desc: "Talks back. Always has the last word." },
  { name: "Thumper", species: "Rabbit", age: "8 months", photo: "thumper-lop.svg", desc: "Binkies across the living room like it's an Olympic event." },
  { name: "Clover", species: "Rabbit", age: "2 years", photo: "clover-rabbit.svg", desc: "Runs this household. We just live in it." },
  { name: "Peanut", species: "Hamster", age: "10 months", photo: "peanut-hamster.svg", desc: "Stuffs cheeks like it's an art form." },
  { name: "Biscuit", species: "Guinea Pig", age: "1 year", photo: "biscuit-guinea.svg", desc: "Wheeks the second the fridge opens." },
  { name: "Kiwi", species: "Bird", age: "5 years", photo: "kiwi-parrot.svg", desc: "Has learned to imitate the microwave beep. Chaos ensues." },
  { name: "Sunny", species: "Bird", age: "2 years", photo: "sunny-canary.svg", desc: "Sings loudest at 6am. We've made peace with it." },
  { name: "Rex", species: "Reptile", age: "3 years", photo: "rex-gecko.svg", desc: "A leopard gecko with a very dramatic tail wiggle." },
  { name: "Spike", species: "Reptile", age: "6 years", photo: "spike-turtle.svg", desc: "Slow, steady, and extremely food-motivated." },
  { name: "Daisy", species: "Dog", age: "4 years", photo: "daisy-pug.svg", desc: "Snores louder than the vacuum cleaner." },
  { name: "Oreo", species: "Cat", age: "2 years", photo: "oreo-cat.svg", desc: "Knocks things off tables to test the laws of gravity." },
  { name: "Nibbles", species: "Guinea Pig", age: "1 year", photo: "nibbles-guinea.svg", desc: "Popcorns with joy at the sound of lettuce." },
  { name: "Ziggy", species: "Bird", age: "3 years", photo: "ziggy-parakeet.svg", desc: "Whistles the theme tune to its owner's favourite show." },
];

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }
  const passwordHash = await hash(password, 10);
  await db.insert(adminUsers).values({ email, passwordHash });
  console.log(`Seeded admin user: ${email} / ${password}`);
}

async function makeApprovedPet(tournamentId: string, demo: (typeof DEMO_PETS)[number], suffix: string) {
  const slug = `${demo.name.toLowerCase()}-${suffix}`;
  await db.insert(pets).values({
    name: demo.name,
    slug,
    photoUrl: `/seed-photos/${demo.photo}`,
    species: demo.species,
    age: demo.age,
    description: demo.desc,
    ownerEmail: `${slug}@example.com`,
    ownerName: null,
    status: "APPROVED",
    agreedToRules: true,
    emailVerifiedAt: new Date(),
    tournamentId,
  });
}

/** Drives a tournament through the real engine, casting votes so a "hero" pet wins every round it's in. */
async function simulateTournament(round64Sunday: Date, count: number, suffix: string) {
  const schedule = scheduleForRound64Sunday(round64Sunday);
  const [tournament] = await db
    .insert(tournaments)
    .values({
      weekLabel: schedule.weekLabel,
      submissionsOpenAt: schedule.submissionsOpenAt,
      submissionsCloseAt: schedule.submissionsCloseAt,
      status: "SUBMISSIONS_OPEN",
    })
    .onConflictDoNothing()
    .returning();

  if (!tournament) {
    console.log(`Tournament ${schedule.weekLabel} already exists, skipping simulation`);
    return null;
  }

  const roster = DEMO_PETS.slice(0, count);
  for (const demo of roster) {
    await makeApprovedPet(tournament.id, demo, `${suffix}`);
  }

  // Both simulated anchors are always <= "now", so submissionsCloseAt has
  // already passed by definition — safe to close right away.
  await closeSubmissionsAndGenerateBrackets(new Date());

  const [refreshed] = await db.select().from(tournaments).where(eq(tournaments.id, tournament.id));
  if (!refreshed?.bracketSize || !refreshed.currentRound) {
    console.log("Not enough approved pets to form a bracket, skipping simulation");
    return refreshed;
  }

  const path = roundPathForSize(refreshed.bracketSize);
  const now = new Date();

  for (const round of path) {
    const window = schedule.rounds[round];
    const roundMatchups = await db
      .select()
      .from(matchupsTable)
      .where(and(eqOp(matchupsTable.tournamentId, tournament.id), eqOp(matchupsTable.round, round)));
    if (roundMatchups.length === 0) break; // engine hasn't generated this round yet (shouldn't happen mid-loop)

    const roundIsFullyPast = window.end <= now;
    const roundIsLiveNow = window.start <= now && now < window.end;

    if (!roundIsFullyPast && !roundIsLiveNow) break; // future round; stop here

    for (const m of roundMatchups) {
      if (!m.petAId || !m.petBId) continue;
      // Cast a handful of votes; slightly favour whichever pet is seeded earlier
      // so results look plausible rather than perfectly even.
      const votesForA = 40 + Math.floor(Math.random() * 60);
      const votesForB = 20 + Math.floor(Math.random() * 60);
      const rows: { matchupId: string; petId: string; voterId: string }[] = [];
      for (let i = 0; i < votesForA; i++) rows.push({ matchupId: m.id, petId: m.petAId, voterId: `sim-a-${m.id}-${i}` });
      for (let i = 0; i < votesForB; i++) rows.push({ matchupId: m.id, petId: m.petBId, voterId: `sim-b-${m.id}-${i}` });
      if (rows.length) await db.insert(votesTable).values(rows);
    }

    if (roundIsFullyPast) {
      await progressLiveMatchups(new Date(window.end.getTime() + 1000));
      await advanceRoundsIfComplete(new Date(window.end.getTime() + 1000));
    } else {
      // Live right now — leave it open for real visitors to vote on.
      break;
    }
  }

  return db.select().from(tournaments).where(eq(tournaments.id, tournament.id)).then((r) => r[0]);
}

async function seedPendingAndRejectedForUpcomingWeek() {
  const now = new Date();
  const tournament = await ensureSubmissionWindow(now);

  const pendingRoster = DEMO_PETS.slice(0, 3);
  for (const demo of pendingRoster) {
    const slug = `${demo.name.toLowerCase()}-pending-demo`;
    await db
      .insert(pets)
      .values({
        name: demo.name,
        slug,
        photoUrl: `/seed-photos/${demo.photo}`,
        species: demo.species,
        age: demo.age,
        description: demo.desc,
        ownerEmail: `${slug}@example.com`,
        status: "PENDING",
        agreedToRules: true,
        emailVerifiedAt: new Date(),
        tournamentId: tournament.id,
      })
      .onConflictDoNothing();
  }

  const rejectedDemo = DEMO_PETS[3];
  const rejectedSlug = `${rejectedDemo.name.toLowerCase()}-rejected-demo`;
  await db
    .insert(pets)
    .values({
      name: rejectedDemo.name,
      slug: rejectedSlug,
      photoUrl: `/seed-photos/${rejectedDemo.photo}`,
      species: rejectedDemo.species,
      ownerEmail: `${rejectedSlug}@example.com`,
      status: "REJECTED",
      rejectionReason: "Photo did not clearly show the pet (admin demo record).",
      agreedToRules: true,
      emailVerifiedAt: new Date(),
      tournamentId: tournament.id,
    })
    .onConflictDoNothing();
}

async function main() {
  console.log("Seeding which-pet-shines demo data...\n");

  await seedAdmin();

  const now = new Date();
  const currentAnchor = onOrBeforeSunday(now);
  const lastWeekAnchor = addDays(currentAnchor, -7);

  console.log(`\nSimulating last week's tournament (${lastWeekAnchor.toDateString()})...`);
  const last = await simulateTournament(lastWeekAnchor, 8, "lw");
  if (last) console.log(`  -> status: ${last.status}, champion: ${last.championPetId ?? "n/a"}`);

  console.log(`\nSimulating this week's tournament (${currentAnchor.toDateString()})...`);
  const current = await simulateTournament(currentAnchor, 10, "tw");
  if (current) console.log(`  -> status: ${current.status}, current round: ${current.currentRound ?? "n/a"}`);

  console.log("\nComputing Pet of the Month for recent months with data...");
  const thisMonth = now.getUTCMonth() + 1;
  const thisYear = now.getUTCFullYear();
  const prevDate = new Date(Date.UTC(thisYear, thisMonth - 2, 1));
  await computeAndApplyPetOfMonth(prevDate.getUTCMonth() + 1, prevDate.getUTCFullYear());
  await computeAndApplyPetOfMonth(thisMonth, thisYear);

  console.log("\nSeeding pending + rejected demo submissions for the upcoming week's admin queue...");
  await seedPendingAndRejectedForUpcomingWeek();

  console.log("\nDone! Run `npm run dev` and explore:");
  console.log("  /            - homepage");
  console.log("  /vote        - vote in a live matchup (if one is currently live)");
  console.log("  /bracket     - this week's bracket");
  console.log("  /hall-of-fame");
  console.log("  /pet-of-the-month");
  console.log("  /admin/login - log in with ADMIN_EMAIL / ADMIN_PASSWORD from .env");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
