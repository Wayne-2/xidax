/**
 * Resend delivery for email verification codes.
 *
 * The HTML template lives here, separate from the business logic, so it can
 * be restyled without touching the auth flow.
 */

export const VERIFICATION_FROM = "Generic PCs <hello@genericpcs.com>";
export const VERIFICATION_SUBJECT = "Your Generic PCs verification code";

export type SendVerificationEmailInput = {
  apiKey: string;
  to: string;
  otp: string;
  expiresInMinutes?: number;
  supportEmail?: string;
  siteUrl?: string;
};

export type SendVerificationEmailResult = {
  ok: boolean;
  status: number;
  id?: string;
};

const BRAND = {
  ink: "#12151c",
  body: "#5c5e66",
  muted: "#8a8f9c",
  line: "#e4e9f0",
  surface: "#f6f8fc",
  accent: "#5865F2",
  accentDark: "#4752C4",
};

/**
 * Builds a responsive, table based HTML email that renders well in Gmail and
 * Outlook. Inline styles are used because most mail clients strip <style>.
 */
export function buildVerificationEmailHtml({
  otp,
  expiresInMinutes = 5,
  supportEmail = "hello@genericpcs.com",
  siteUrl = "https://genericpcs.com",
}: {
  otp: string;
  expiresInMinutes?: number;
  supportEmail?: string;
  siteUrl?: string;
}): string {
  const digits = otp
    .split("")
    .map(
      (digit) =>
        `<td align="center" style="width:44px;height:56px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:10px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:26px;font-weight:700;color:${BRAND.ink};">${digit}</td>`
    )
    .join('<td width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="support-mode" content="newest">
<title>${VERIFICATION_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.surface};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden;">

          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid ${BRAND.line};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="font-size:19px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">
                    Generic&nbsp;PCS
                  </td>
                  <td align="right" style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.muted};">
                    Email verification
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">
                Your verification code
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
                Enter this code to confirm your email address and finish setting up your Generic PCS account.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:28px 32px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>${digits}</tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:12px 32px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">
                This code expires in ${expiresInMinutes} minutes and can only be used once.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${BRAND.ink};">
                      Did not request this code?
                    </p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.body};">
                      You can safely ignore this email. Your address is only used to confirm this account.
                      If someone else is trying to sign up, forward this email to
                      <a href="mailto:${supportEmail}" style="color:${BRAND.accent};text-decoration:underline;">${supportEmail}</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 32px 32px;">
              <a href="${siteUrl}" style="display:inline-block;padding:13px 26px;background:${BRAND.accent};border-radius:10px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                Continue to Generic PCS
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px;background:#fbfcfe;border-top:1px solid ${BRAND.line};">
              <p style="margin:0;font-size:12px;line-height:1.7;color:${BRAND.muted};text-align:center;">
                Generic PCS Technologies Ltd &nbsp;&bull;&nbsp;
                <a href="${siteUrl}" style="color:${BRAND.accent};text-decoration:none;">genericpcs.com</a>
                &nbsp;&bull;&nbsp;
                <a href="mailto:${supportEmail}" style="color:${BRAND.accent};text-decoration:none;">${supportEmail}</a>
              </p>
            </td>
          </tr>

        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding:20px 16px 0;">
              <p style="margin:0;font-size:11px;line-height:1.7;color:${BRAND.muted};">
                You are receiving this because someone signed up to Generic PCS with this email address.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Sends the verification code through the Resend REST API. */
export async function sendVerificationEmail({
  apiKey,
  to,
  otp,
  expiresInMinutes,
  supportEmail,
  siteUrl,
}: SendVerificationEmailInput): Promise<SendVerificationEmailResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: VERIFICATION_FROM,
      to: [to],
      subject: VERIFICATION_SUBJECT,
      html: buildVerificationEmailHtml({
        otp,
        expiresInMinutes,
        supportEmail,
        siteUrl,
      }),
    }),
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const payload = (await response.json().catch(() => null)) as {
    id?: string;
  } | null;

  return { ok: true, status: response.status, id: payload?.id };
}
