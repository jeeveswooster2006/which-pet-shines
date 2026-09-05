import "server-only";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}

/** Dev-friendly default: logs the email instead of sending it. Zero setup, zero cost. */
class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput) {
     
    console.log(
      `\n--- [email:console] to=${input.to} subject="${input.subject}" ---\n${input.text}\n---------------------------------------------\n`
    );
  }
}

/** Real provider for production. Requires RESEND_API_KEY. */
class ResendEmailProvider implements EmailProvider {
  async send(input: SendEmailInput) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    const from = process.env.EMAIL_FROM || "Which Pet Shines? <hello@example.com>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend send failed: ${res.status} ${body}`);
    }
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  provider =
    process.env.EMAIL_PROVIDER === "resend"
      ? new ResendEmailProvider()
      : new ConsoleEmailProvider();
  return provider;
}

export async function sendVerificationEmail(opts: {
  to: string;
  petName: string;
  verifyUrl: string;
}) {
  const { to, petName, verifyUrl } = opts;
  await getEmailProvider().send({
    to,
    subject: `Confirm ${petName}'s entry into Which Pet Shines?`,
    text: `Confirm ${petName}'s entry by visiting: ${verifyUrl}\n\nIf you didn't submit this, you can ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h1 style="font-size:20px">✨ Confirm ${petName}'s entry</h1>
        <p>One more step and ${petName} is in the running for this week's title.</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;background:#ff5d7a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">
            Confirm entry
          </a>
        </p>
        <p style="color:#888;font-size:13px">If the button doesn't work, copy this link:<br>${verifyUrl}</p>
        <p style="color:#888;font-size:13px">Didn't submit this? You can safely ignore this email.</p>
      </div>
    `,
  });
}
