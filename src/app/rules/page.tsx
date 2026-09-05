import type { Metadata } from "next";
import { LegalLayout, LegalNotice } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Rules",
  description: "Competition rules for Which Pet Shines?",
};

export default function RulesPage() {
  return (
    <LegalLayout title="Competition Rules" updated="Draft — pending legal review">
      <LegalNotice>
        This page is a structured starting point for real competition rules, not professional legal
        advice. Please have it reviewed by a lawyer in your jurisdiction before relying on it, especially
        around prize terms (if any), data protection, and consumer/competition law.
      </LegalNotice>

      <h2>1. Who can enter</h2>
      <p>
        Anyone who owns or cares for a real, legally-kept domestic pet may enter, subject to these
        rules. By submitting, you confirm you are legally able to enter into this agreement in your
        jurisdiction. Employees or close family of the site operator may be excluded from prizes (if
        any) at the operator&apos;s discretion.
      </p>

      <h2>2. Pet submissions</h2>
      <ul>
        <li>One pet entry per person per weekly tournament, verified by email confirmation.</li>
        <li>Required: pet name, one clear photo, your email address, and agreement to these rules.</li>
        <li>Optional: species/type, age, and a short description.</li>
        <li>
          Submissions are reviewed by our moderation team before appearing in a bracket. We may reject
          any submission at our discretion, including for inappropriate content, low-quality or
          misleading photos, or suspected abuse of the entry system.
        </li>
        <li>
          Eligible pets include dogs, cats, birds, rabbits, reptiles, hamsters, guinea pigs, and other
          legitimate domestic pets. Wild, exotic, or illegally-kept animals are not eligible.
        </li>
      </ul>

      <h2>3. Tournament rules</h2>
      <ul>
        <li>Submissions open Monday through Saturday each week, for that week&apos;s bracket.</li>
        <li>
          The bracket size is the largest suitable power of two for the number of eligible entries
          that week (up to 64). If more pets are eligible than the bracket allows, entries are chosen
          at random.
        </li>
        <li>Matchups are generated randomly. Each knockout round lasts 24 hours.</li>
        <li>
          Rounds run Sunday (Round of 64) through Friday (Final), with the weekly champion announced
          on Saturday.
        </li>
      </ul>

      <h2>4. Voting</h2>
      <ul>
        <li>Anyone may vote in any matchup, including for their own pet.</li>
        <li>One vote per matchup per person. We use basic technical measures to discourage duplicate voting; this is not a fraud-proof system.</li>
        <li>
          If a matchup ends tied, a one-hour sudden-death voting round decides it. If it&apos;s still
          tied after that, the winner is chosen by a random tie-break system, and the result will say
          so.
        </li>
        <li>Emoji reactions are for fun only and never affect the outcome of any matchup.</li>
      </ul>

      <h2>5. Winners</h2>
      <ul>
        <li>The pet that wins the Final is that week&apos;s Champion.</li>
        <li>
          <strong>Pet of the Month is different from the weekly champion.</strong> It goes to whichever
          pet receives the highest total number of votes across all of its matchups during the calendar
          month — regardless of whether it won any individual matchup.
        </li>
        <li>Pet of the Month winners are added permanently to the Hall of Fame.</li>
      </ul>

      <h2>6. Fair play</h2>
      <p>
        Do not use bots, scripts, paid click farms, or coordinated groups to manipulate voting. We may
        remove votes, disqualify entries, or ban participants we reasonably believe are manipulating
        the competition.
      </p>

      <h2>7. Photograph and content rights</h2>
      <p>
        You keep ownership of any photo you submit. By submitting, you grant Which Pet Shines? a
        non-exclusive, worldwide, royalty-free license to display, reproduce, and use your submission
        (including your pet&apos;s name and description) to run the competition and for reasonable
        promotional purposes related to it (such as the homepage, social media, and the Hall of Fame).
        You confirm you have the right to grant this license and that you have permission to submit the
        photograph.
      </p>

      <h2>8. Moderation</h2>
      <p>
        We may remove any submission, vote, or reaction, and suspend or ban any participant, at our
        discretion, including for content we consider inappropriate, offensive, or in breach of these
        rules.
      </p>
    </LegalLayout>
  );
}
