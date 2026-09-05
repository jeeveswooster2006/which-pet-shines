import type { Metadata } from "next";
import { LegalLayout, LegalNotice } from "@/components/LegalLayout";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="Draft — pending legal review">
      <LegalNotice>
        This is a structural starting point, not professional legal advice. Real data-protection
        obligations (GDPR, CCPA, or others depending on where your users are) depend on your specific
        setup — have this reviewed by a lawyer before launch.
      </LegalNotice>

      <h2>1. What we collect</h2>
      <ul>
        <li>Pet submission details: pet name, photo, species, age, description.</li>
        <li>Your email address, used only to verify and communicate about your submission.</li>
        <li>Your name, if you choose to provide it.</li>
        <li>
          Anonymous technical identifiers (cookies) used to prevent duplicate voting and reactions, and
          to run the admin session.
        </li>
        <li>Standard server logs (IP address, browser type) for security and abuse prevention.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To run the weekly competition: verifying entries, displaying pets, and tallying votes.</li>
        <li>To email you about your submission (confirmation, and moderation outcome).</li>
        <li>To prevent abuse, such as duplicate voting or fraudulent submissions.</li>
        <li>To display your pet&apos;s public page, as described in the Competition Rules.</li>
      </ul>

      <h2>3. What we don&apos;t do</h2>
      <p>
        We don&apos;t sell your personal information. We don&apos;t display your email address publicly.
        [Add specifics once a real email/analytics/storage vendor is selected — see README.]
      </p>

      <h2>4. Cookies</h2>
      <p>
        See our <a href="/cookies" className="underline">Cookie Policy</a> for details on the cookies we
        use.
      </p>

      <h2>5. Data retention</h2>
      <p>
        Pet pages, competition history, and awards are kept indefinitely as part of the public Hall of
        Fame and permanent pet pages, since that&apos;s the point of the Service. [A real policy should
        specify retention for rejected submissions, raw logs, and how to request removal.]
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, or delete your personal
        information. [Add a real contact method and process here.]
      </p>

      <h2>7. Children</h2>
      <p>
        The Service is intended for use by adults submitting and voting on pets. [Add an age
        requirement and process appropriate to your jurisdiction.]
      </p>

      <h2>8. Contact</h2>
      <p>Questions about this policy can be sent to the {SITE_NAME} operator. [Add contact details.]</p>
    </LegalLayout>
  );
}
