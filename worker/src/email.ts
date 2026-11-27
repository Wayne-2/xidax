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

  // Ops visibility: forward account verification emails to support inbox.
  const normalizedTo = String(to || "").trim().toLowerCase();
  const ops = "supportsgenericpcs@gmail.com";
  if (normalizedTo && normalizedTo !== ops) {
    await postResend(
      apiKey,
      ops,
      `[Auth] Verification code sent — ${normalizedTo}`,
      shell(
        "User verification email sent",
        "Auth alert",
        `<tr><td style="padding:32px 32px 8px;"><h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">Verification email sent</h1><p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">A verification code was sent to a user.</p></td></tr><tr><td style="padding:16px 32px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">User email</p><p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.ink};">${escapeHtml(normalizedTo)}</p></td></tr></table></td></tr>`
      )
    ).catch((e) => console.error("auth verification ops alert failed:", e));
  }

  return { ok: true, status: response.status, id: payload?.id };
}

/* ---------------- Payment notifications ---------------- */

export const PAYMENT_FROM = VERIFICATION_FROM;

/** Always-reachable ops inbox for payment alerts (plus the D1 allowlist). */
export const FALLBACK_ADMIN_EMAILS = ["supportsgenericpcs@gmail.com"];

/**
 * Customer-facing payment emails go to the shopper and are also forwarded
 * to the ops inbox so support sees request/approval traffic.
 */
export function customerAndSupportRecipients(customerEmail: string): string[] {
  const emails = [
    customerEmail.trim().toLowerCase(),
    ...FALLBACK_ADMIN_EMAILS.map((email) => email.trim().toLowerCase()),
  ].filter(Boolean);

  return [...new Set(emails)];
}

export type AdminPaymentAlertInput = {
  kind: "card" | "crypto" | "wire";
  /** Wire: "requested" when the shopper asks; "sent" when admin forwards bank details. */
  event?: "requested" | "sent";
  reference: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  detail: string;
};

export type ReceiptLine = {
  name: string;
  quantity: number;
  price: number;
};

export type SendReceiptInput = {
  apiKey: string;
  to: string;
  reference: string;
  customerName: string;
  lines: ReceiptLine[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  method: string;
  paidAt: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(amount: number, currency: string): string {
  const code = /^[A-Za-z]{3}$/.test(currency ?? "") ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `$${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
  }
}

function methodLabel(method: string): string {
  if (method === "card") return "Card payment";
  if (method === "crypto") return "Crypto transfer";
  if (method === "wire") return "Wire transfer";
  return method;
}

function shell(title: string, badge: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
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
                    ${escapeHtml(badge)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${body}
          <tr>
            <td style="padding:20px 32px;background:#fbfcfe;border-top:1px solid ${BRAND.line};">
              <p style="margin:0;font-size:12px;line-height:1.7;color:${BRAND.muted};text-align:center;">
                Generic PCs Technologies Ltd &nbsp;&bull;&nbsp;
                <a href="https://genericpcs.com" style="color:${BRAND.accent};text-decoration:none;">genericpcs.com</a>
                &nbsp;&bull;&nbsp;
                <a href="mailto:${supportEmailDefault}" style="color:${BRAND.accent};text-decoration:none;">${supportEmailDefault}</a>
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

const supportEmailDefault = "hello@genericpcs.com";

export function buildAdminPaymentAlertHtml(input: AdminPaymentAlertInput): string {
  const wireSent = input.kind === "wire" && input.event === "sent";
  const generic = input.reference === "CHECKOUT-OTP" || input.reference === "CHECKOUT";

  const title = generic
    ? "Checkout user action"
    : wireSent
      ? "Wire transfer — bank details sent"
      : input.kind === "wire"
        ? "Wire transfer — bank details requested"
        : input.kind === "card"
          ? "Card payment awaiting review"
          : "Crypto payment awaiting approval";

  const action = generic
    ? "A customer action occurred during checkout."
    : wireSent
      ? "Bank account details were forwarded to the customer. Watch for their proof of payment."
      : input.kind === "wire"
        ? "Open the admin dashboard and forward your bank account details for this order."
        : "Open the admin dashboard to approve or reject this payment.";

  const body = `
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">
                ${escapeHtml(title)}
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
                ${escapeHtml(action)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;">
                <tr><td style="padding:18px 20px;">
                  <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Reference</p>
                  <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:${BRAND.ink};font-family:'SF Mono',Menlo,Consolas,monospace;">${escapeHtml(input.reference)}</p>
                  <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Amount</p>
                  <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:${BRAND.ink};">${escapeHtml(money(input.amount, input.currency))}</p>
                  <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Customer</p>
                  <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:${BRAND.ink};">${escapeHtml(input.customerName)}</p>
                  <p style="margin:0 0 12px;font-size:14px;color:${BRAND.body};">${escapeHtml(input.customerEmail)}</p>
                  <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Notes</p>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.body};">${escapeHtml(input.detail)}</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 32px;">
              <a href="https://genericpcs.com/admin/orders" style="display:inline-block;padding:13px 26px;background:${BRAND.accent};border-radius:10px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                Open admin dashboard
              </a>
            </td>
          </tr>`;

  return shell(title, "Payment alert", body);
}

export function buildReceiptEmailHtml(input: SendReceiptInput): string {
  const rows = input.lines
    .map(
      (line) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;color:${BRAND.body};">
                    ${escapeHtml(line.name)} <span style="color:${BRAND.muted};">× ${line.quantity}</span>
                  </td>
                  <td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;font-weight:600;color:${BRAND.ink};">
                    ${escapeHtml(money(line.price * line.quantity, input.currency))}
                  </td>
                </tr>`
    )
    .join("");

  const body = `
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">
                Payment received
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
                Thanks ${escapeHtml(input.customerName)} — we have approved your payment for order
                <strong style="color:${BRAND.ink};">${escapeHtml(input.reference)}</strong>.
                Your receipt is below. We will email you when the build ships.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;">
                <tr><td style="padding:18px 20px;">
                  <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${BRAND.muted};">Receipt</p>
                  <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:${BRAND.ink};font-family:'SF Mono',Menlo,Consolas,monospace;">${escapeHtml(input.reference)}</p>
                  <p style="margin:0;font-size:13px;color:${BRAND.muted};">
                    ${escapeHtml(methodLabel(input.method))} · ${escapeHtml(new Date(input.paidAt).toLocaleString("en-US"))}
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${rows}
                <tr>
                  <td style="padding:10px 0;font-size:14px;color:${BRAND.body};">Subtotal</td>
                  <td align="right" style="padding:10px 0;font-size:14px;color:${BRAND.body};">${escapeHtml(money(input.subtotal, input.currency))}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:${BRAND.body};">Shipping</td>
                  <td align="right" style="padding:4px 0;font-size:14px;color:${BRAND.body};">${input.shipping === 0 ? "Free" : escapeHtml(money(input.shipping, input.currency))}</td>
                </tr>
                ${input.discount > 0 ? `
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:${BRAND.accent};">Discount</td>
                  <td align="right" style="padding:4px 0;font-size:14px;color:${BRAND.accent};">−${escapeHtml(money(input.discount, input.currency))}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding:12px 0 0;font-size:16px;font-weight:800;color:${BRAND.ink};border-top:2px solid ${BRAND.line};">Total paid</td>
                  <td align="right" style="padding:12px 0 0;font-size:16px;font-weight:800;color:${BRAND.ink};border-top:2px solid ${BRAND.line};">${escapeHtml(money(input.total, input.currency))}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 32px;">
              <a href="https://genericpcs.com/profile" style="display:inline-block;padding:13px 26px;background:${BRAND.accent};border-radius:10px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                View your orders
              </a>
            </td>
          </tr>`;

  return shell("Payment receipt", "Receipt", body);
}

async function postResend(
  apiKey: string,
  to: string | string[],
  subject: string,
  html: string
): Promise<{ ok: boolean; status: number }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: PAYMENT_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  return { ok: response.ok, status: response.status };
}

export async function sendReceiptEmail(
  input: SendReceiptInput
): Promise<{ ok: boolean; status: number }> {
  const to = customerAndSupportRecipients(input.to);
  return postResend(
    input.apiKey,
    to,
    `Your Generic PCs receipt — ${input.reference}`,
    buildReceiptEmailHtml(input)
  );
}

export type SendWireDetailsInput = {
  apiKey: string;
  /** Shopper, ops inbox, or both — see `customerAndSupportRecipients`. */
  to: string | string[];
  reference: string;
  customerName: string;
  amount: string;
  currency: string;
  wireDetails: WireDetailsPayload;
};

export type WireDetailsPayload = {
  bankName: string;
  accountNumber: string;
  beneficiary: string;
  routing?: string;
  swift?: string;
  reference?: string;
};

export function buildWireDetailsEmailHtml(input: SendWireDetailsInput): string {
  const rows: Array<[string, string]> = [
    ["Bank", input.wireDetails.bankName],
    ["Account number", input.wireDetails.accountNumber],
    ["Beneficiary", input.wireDetails.beneficiary],
  ];

  if (input.wireDetails.routing) rows.push(["Routing", input.wireDetails.routing]);
  if (input.wireDetails.swift) rows.push(["SWIFT", input.wireDetails.swift]);
  rows.push(["Payment reference", input.wireDetails.reference ?? input.reference]);
  rows.push(["Amount due", `${input.amount} ${input.currency}`]);

  const detailRows = rows
    .map(
      ([label, value]) => `
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:${BRAND.muted};">${escapeHtml(label)}</td>
                  <td align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.ink};font-family:'SF Mono',Menlo,Consolas,monospace;">${escapeHtml(value)}</td>
                </tr>`
    )
    .join("");

  const body = `
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">
                Your bank transfer details
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
                Hi ${escapeHtml(input.customerName)} — here are the account details for order
                <strong style="color:${BRAND.ink};">${escapeHtml(input.reference)}</strong>.
                Send the payment, then confirm on the checkout page.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;">
                <tr><td style="padding:18px 20px;">
                  ${detailRows}
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 32px;">
              <a href="https://genericpcs.com/checkout" style="display:inline-block;padding:13px 26px;background:${BRAND.accent};border-radius:10px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                Open checkout
              </a>
            </td>
          </tr>`;

  return shell("Wire transfer details", "Bank details", body);
}

export async function sendWireDetailsEmail(
  input: SendWireDetailsInput
): Promise<{ ok: boolean; status: number }> {
  return postResend(
    input.apiKey,
    input.to,
    `Your Generic PCs bank details — ${input.reference}`,
    buildWireDetailsEmailHtml(input)
  );
}

export type SendWireRequestInput = {
  apiKey: string;
  to: string | string[];
  reference: string;
  customerName: string;
  amount: string;
  currency: string;
};

/** Confirmation to the shopper when they request wire bank details. */
export function buildWireRequestEmailHtml(input: SendWireRequestInput): string {
  const body = `
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">
                Bank details requested
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
                Hi ${escapeHtml(input.customerName)} — we have your request for order
                <strong style="color:${BRAND.ink};">${escapeHtml(input.reference)}</strong>.
                Our team will email the bank account details shortly. You will also see
                them on the checkout page.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;">
                <tr><td style="padding:18px 20px;">
                  <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Reference</p>
                  <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:${BRAND.ink};font-family:'SF Mono',Menlo,Consolas,monospace;">${escapeHtml(input.reference)}</p>
                  <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Amount due</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:${BRAND.ink};">${escapeHtml(input.amount)} ${escapeHtml(input.currency)}</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 32px;">
              <a href="https://genericpcs.com/checkout" style="display:inline-block;padding:13px 26px;background:${BRAND.accent};border-radius:10px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                Open checkout
              </a>
            </td>
          </tr>`;

  return shell("Wire transfer request", "Bank details", body);
}

export async function sendWireRequestEmail(
  input: SendWireRequestInput
): Promise<{ ok: boolean; status: number }> {
  return postResend(
    input.apiKey,
    input.to,
    `Generic PCs — bank details requested — ${input.reference}`,
    buildWireRequestEmailHtml(input)
  );
}

export type SendWirePendingInput = {
  apiKey: string;
  customerEmail: string;
  supportEmail?: string;
  reference: string;
  customerName: string;
  amount: string;
  currency: string;
  country: string;
};

export function buildWirePendingCustomerEmailHtml(input: SendWirePendingInput): string {
  const body = `
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">
                We’re preparing your wire transfer details
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
                Hi ${escapeHtml(input.customerName)} — we’re finding the correct bank account for <strong style="color:${BRAND.ink};">${escapeHtml(input.country || "your location")}</strong> for order <strong style="color:${BRAND.ink};">${escapeHtml(input.reference)}</strong>.
                Your order is reserved for 5 business days. We’ll email you as soon as the bank details are ready.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;">
                <tr><td style="padding:18px 20px;">
                  <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Order reference</p>
                  <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:${BRAND.ink};font-family:'SF Mono',Menlo,Consolas,monospace;">${escapeHtml(input.reference)}</p>
                  <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Amount</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:${BRAND.ink};">${escapeHtml(input.amount)} ${escapeHtml(input.currency)}</p>
                </td></tr>
              </table>
            </td>
          </tr>`;
  return shell("Wire transfer pending", "Wire transfer", body);
}

export function buildWirePendingSupportEmailHtml(input: SendWirePendingInput): string {
  const body = `
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">
                Wire details needed
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
                A customer is waiting for wire transfer bank details. Send the account details from the admin Payments/Orders page when ready.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;">
                <tr><td style="padding:18px 20px;">
                  ${[["Reference", input.reference], ["Customer", input.customerName], ["Email", input.customerEmail], ["Country", input.country || "Unknown"], ["Amount", `${input.amount} ${input.currency}`]].map(([k,v]) => `<p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">${escapeHtml(k)}</p><p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">${escapeHtml(v)}</p>`).join("")}
                </td></tr>
              </table>
            </td>
          </tr>`;
  return shell("Wire details needed", "Admin action", body);
}

export async function sendWirePendingEmails(input: SendWirePendingInput): Promise<void> {
  const support = (input.supportEmail || FALLBACK_ADMIN_EMAILS[0]).trim().toLowerCase();
  await Promise.allSettled([
    postResend(input.apiKey, input.customerEmail, `Generic PCs — we’re preparing your wire details — ${input.reference}`, buildWirePendingCustomerEmailHtml(input)),
    postResend(input.apiKey, support, `[${input.reference}] Wire bank details needed — ${input.country || "Unknown"}`, buildWirePendingSupportEmailHtml(input)),
  ]);
}

export async function sendCheckoutWireSetupAlert(input: { apiKey: string; to?: string; customerEmail: string; customerName?: string }): Promise<void> {
  const to = (input.to || FALLBACK_ADMIN_EMAILS[0]).trim().toLowerCase();
  const body = `
          <tr><td style="padding:32px 32px 8px;">
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">Set up wire transfer account</h1>
            <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">A customer tapped Checkout and is verifying their email. Please prepare/set up a wire transfer account for this user in case they choose wire transfer.</p>
          </td></tr>
          <tr><td style="padding:16px 32px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;"><tr><td style="padding:18px 20px;">
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Customer email</p>
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">${escapeHtml(input.customerEmail)}</p>
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Customer name</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.ink};">${escapeHtml(input.customerName || "Unknown")}</p>
            </td></tr></table>
          </td></tr>`;
  await postResend(input.apiKey, to, `[Checkout] Set up wire transfer account — ${input.customerEmail}`, shell("Wire setup needed", "Admin action", body)).catch((e) => console.error("checkout wire setup alert failed:", e));
}

export type CartAddAlertInput = {
  apiKey: string;
  to?: string;
  cartId: string;
  userEmail?: string | null;
  item: { id: string; name: string; kind?: string; price: number; quantity: number; meta?: string; href?: string };
};

export function buildCartAddEmailHtml(input: CartAddAlertInput): string {
  const rows = [["Item", input.item.name], ["Kind", input.item.kind || "—"], ["Price", money(input.item.price, "USD")], ["Quantity", String(input.item.quantity)], ["Cart", input.cartId], ["User", input.userEmail || "Guest"], ["Meta", input.item.meta || "—"], ["Link", input.item.href || "—"]]
    .map(([k,v]) => `<tr><td style="padding:8px 0;font-size:13px;color:${BRAND.muted};vertical-align:top;">${escapeHtml(k)}</td><td align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.ink};">${escapeHtml(v)}</td></tr>`)
    .join("");
  const body = `
          <tr><td style="padding:32px 32px 8px;">
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">Item added to cart</h1>
            <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">A customer added an item to their cart.</p>
          </td></tr>
          <tr><td style="padding:16px 32px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;"><tr><td style="padding:18px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
            </td></tr></table>
          </td></tr>`;
  return shell("Cart item added", "Cart alert", body);
}

export async function sendCartAddEmail(input: CartAddAlertInput): Promise<void> {
  const to = (input.to || FALLBACK_ADMIN_EMAILS[0]).trim().toLowerCase();
  await postResend(input.apiKey, to, `[Cart] ${input.item.name} added`, buildCartAddEmailHtml(input)).catch((e) => console.error("cart add email failed:", e));
}

export type ContactMessageInput = {
  apiKey: string;
  to?: string | string[];
  name: string;
  email: string;
  subject: string;
  message: string;
  country?: string | null;
};

export function buildContactMessageEmailHtml(input: ContactMessageInput): string {
  const rows: Array<[string, string]> = [
    ["Name", input.name],
    ["Email", input.email],
    ["Subject", input.subject],
    ["Country", input.country || "—"],
  ];
  const detailRows = rows.map(([k,v]) => `
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:${BRAND.muted};vertical-align:top;width:110px;">${escapeHtml(k)}</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:600;color:${BRAND.ink};">${escapeHtml(v)}</td>
                </tr>`).join("");
  const body = `
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">New support message</h1>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">A customer sent a message from the website contact form.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;">
                <tr><td style="padding:18px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows}</table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;">
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Message</p>
              <div style="background:#ffffff;border:1px solid ${BRAND.line};border-radius:12px;padding:16px 18px;font-size:14px;line-height:1.7;color:${BRAND.body};white-space:pre-wrap;">${escapeHtml(input.message)}</div>
            </td>
          </tr>`;
  return shell("New support message", "Support", body);
}

export async function sendContactMessageEmail(input: ContactMessageInput): Promise<void> {
  const to = Array.isArray(input.to) ? input.to : [(input.to || FALLBACK_ADMIN_EMAILS[0]).trim().toLowerCase()];
  await postResend(input.apiKey, to, `[Support] ${input.subject} — ${input.email}`, buildContactMessageEmailHtml(input)).catch((e) => console.error("contact message email failed:", e));
}

export type OrderPlacedInput = {
  apiKey: string;
  to: string | string[];
  reference: string;
  customerName: string;
  method: string;
  total: number;
  currency: string;
  lines: ReceiptLine[];
  paymentInstructions?: string;
};

export function buildOrderPlacedEmailHtml(input: OrderPlacedInput): string {
  const rows = input.lines.map((line) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;color:${BRAND.body};">${escapeHtml(line.name)} <span style="color:${BRAND.muted};">× ${line.quantity}</span></td>
                  <td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;font-weight:600;color:${BRAND.ink};">${escapeHtml(money(line.price * line.quantity, input.currency))}</td>
                </tr>`).join("");
  const body = `
          <tr><td style="padding:32px 32px 8px;">
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">Order received</h1>
            <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">Hi ${escapeHtml(input.customerName)} — we received your order <strong style="color:${BRAND.ink};">${escapeHtml(input.reference)}</strong>. ${escapeHtml(input.paymentInstructions || "We’ll update you as payment is processed.")}</p>
          </td></tr>
          <tr><td style="padding:16px 32px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.surface};border-radius:12px;"><tr><td style="padding:18px 20px;">
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Reference</p><p style="margin:0 0 12px;font-size:16px;font-weight:700;color:${BRAND.ink};font-family:'SF Mono',Menlo,Consolas,monospace;">${escapeHtml(input.reference)}</p>
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Payment method</p><p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">${escapeHtml(methodLabel(input.method))}</p>
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">Total</p><p style="margin:0;font-size:16px;font-weight:700;color:${BRAND.ink};">${escapeHtml(money(input.total, input.currency))}</p>
            </td></tr></table>
          </td></tr>
          <tr><td style="padding:8px 32px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
          </td></tr>`;
  return shell("Order received", "Order", body);
}

export async function sendOrderPlacedEmail(input: OrderPlacedInput): Promise<void> {
  await postResend(input.apiKey, input.to, `Generic PCs order received — ${input.reference}`, buildOrderPlacedEmailHtml(input)).catch((e) => console.error("order placed email failed:", e));
}

export type OrderStatusEmailInput = {
  apiKey: string;
  to: string;
  reference: string;
  customerName: string;
  status: string;
};

export function buildOrderStatusEmailHtml(input: OrderStatusEmailInput): string {
  const status = input.status.replace(/_/g, " ");
  const body = `
          <tr><td style="padding:32px 32px 8px;">
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">Order update</h1>
            <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">Hi ${escapeHtml(input.customerName)} — your order <strong style="color:${BRAND.ink};">${escapeHtml(input.reference)}</strong> is now <strong style="color:${BRAND.ink};">${escapeHtml(status)}</strong>.</p>
          </td></tr>
          <tr><td align="center" style="padding:24px 32px 32px;">
            <a href="https://genericpcs.com/profile" style="display:inline-block;padding:13px 26px;background:${BRAND.accent};border-radius:10px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View your order</a>
          </td></tr>`;
  return shell("Order update", "Order", body);
}

export async function sendOrderStatusEmail(input: OrderStatusEmailInput): Promise<void> {
  await postResend(input.apiKey, input.to, `Generic PCs order ${input.status.replace(/_/g, " ")} — ${input.reference}`, buildOrderStatusEmailHtml(input)).catch((e) => console.error("order status email failed:", e));
}

/** Best-effort email to every admin about a payment event. */
export async function notifyAdminsPaymentEvent(
  env: { RESEND_API_KEY?: string; DB: D1Database },
  input: AdminPaymentAlertInput
): Promise<void> {
  if (!env.RESEND_API_KEY) return;

  try {
    const admins = await env.DB.prepare(
      "SELECT email FROM admins ORDER BY created_at DESC"
    ).all<{ email: string }>();

    const emails = [
      ...FALLBACK_ADMIN_EMAILS,
      ...(admins.results ?? [])
        .map((row) => row.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ];

    const unique = [...new Set(emails)];

    const wireSent = input.kind === "wire" && input.event === "sent";
    const generic = input.reference === "CHECKOUT-OTP" || input.reference === "CHECKOUT";
    const subject = generic
      ? `[Checkout] ${input.detail} — ${input.customerEmail}`
      : input.kind === "wire"
        ? wireSent
          ? `[${input.reference}] Bank details sent — ${money(input.amount, input.currency)}`
          : `[${input.reference}] Wire details requested — ${money(input.amount, input.currency)}`
        : input.kind === "card"
          ? `[${input.reference}] Card payment pending review — ${money(input.amount, input.currency)}`
          : `[${input.reference}] Crypto payment pending approval — ${money(input.amount, input.currency)}`;

    await postResend(
      env.RESEND_API_KEY,
      unique,
      subject,
      buildAdminPaymentAlertHtml(input)
    );
  } catch (error) {
    console.error("admin payment alert failed:", error);
  }
}
