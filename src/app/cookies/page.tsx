import type { Metadata } from "next";
import { LegalLayout, LegalNotice } from "@/components/LegalLayout";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" updated="Draft — pending legal review">
      <LegalNotice>
        This is a structural starting point, not professional legal advice — and it should be updated if
        you add analytics, ads, or other third-party cookies later.
      </LegalNotice>

      <h2>Cookies we use</h2>
      <p>
        All cookies currently used by Which Pet Shines? are strictly necessary to make the Service
        work, and none are used for advertising or third-party tracking:
      </p>
      <ul>
        <li>
          <strong>Voter identifier</strong> — an anonymous, randomly generated id so we can prevent the
          same visitor voting twice in a matchup, and to remember your reactions.
        </li>
        <li>
          <strong>Admin session</strong> — only set for logged-in administrators, to keep the admin area
          secure.
        </li>
      </ul>

      <h2>No third-party or advertising cookies</h2>
      <p>
        We don&apos;t currently use analytics, advertising, or social-media tracking cookies. If that
        changes, this page should be updated first, along with a consent mechanism appropriate to your
        users&apos; jurisdictions.
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can block or delete cookies in your browser settings, but doing so may prevent voting from
        working correctly (we won&apos;t be able to stop you voting twice in the same matchup, and your
        session may not persist).
      </p>
    </LegalLayout>
  );
}
