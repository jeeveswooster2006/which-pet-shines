import type { Metadata } from "next";
import { LegalLayout, LegalNotice } from "@/components/LegalLayout";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions" updated="Draft — pending legal review">
      <LegalNotice>
        This is a structural template, not professional legal advice. Have a qualified lawyer review
        and adapt it — especially the liability, jurisdiction, and dispute-resolution sections — before
        launch.
      </LegalNotice>

      <h2>1. Acceptance of terms</h2>
      <p>
        By using {SITE_NAME} (the &quot;Service&quot;), including browsing, voting, reacting, or
        submitting a pet, you agree to these Terms and our{" "}
        <a href="/privacy" className="underline">Privacy Policy</a> and{" "}
        <a href="/rules" className="underline">Competition Rules</a>.
      </p>

      <h2>2. The Service</h2>
      <p>
        {SITE_NAME} is a weekly, entertainment-only knockout competition and voting platform for
        photographs of pets. It is not affiliated with any veterinary, breeding, or pet-registration
        authority, and does not verify pet ownership beyond the confirmations entrants provide.
      </p>

      <h2>3. Accounts and submissions</h2>
      <p>
        Submissions are verified by email rather than a full account, for this version of the Service.
        You are responsible for the accuracy of information you submit and for maintaining access to
        the email address you provide.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Submit content that is illegal, infringing, obscene, or that you don&apos;t have rights to.</li>
        <li>Attempt to manipulate voting through automation, bots, or coordinated inauthentic behavior.</li>
        <li>Attempt to gain unauthorized access to the Service, including the admin area.</li>
        <li>Use the Service to harass, impersonate, or harm any person or animal.</li>
      </ul>

      <h2>5. Content license</h2>
      <p>
        As described in the <a href="/rules" className="underline">Competition Rules</a>, you retain
        ownership of photos you submit and grant us a license to display and promote them in connection
        with the Service.
      </p>

      <h2>6. Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind, to the fullest extent
        permitted by law. We do not guarantee uninterrupted or error-free operation.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {SITE_NAME} and its operators are not liable for
        indirect, incidental, or consequential damages arising from your use of the Service.
        [Jurisdiction-specific liability caps and exclusions should be added here by a lawyer.]
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service after changes take
        effect constitutes acceptance of the revised Terms.
      </p>

      <h2>9. Contact</h2>
      <p>Questions about these Terms can be sent to the site operator&apos;s contact address. [Add contact details.]</p>
    </LegalLayout>
  );
}
