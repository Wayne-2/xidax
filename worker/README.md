# Generic PCs — Firebase Email OTP Verification

Custom six digit email OTP verification for Generic PCs, replacing Firebase's
default email verification link.

```
Frontend (Next.js)  ──Firebase ID token──▶  Cloudflare Worker
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        ▼                       ▼                       ▼
                Firebase Auth            D1 (OTP + app data)         Resend (email)
```

Firebase remains the identity provider. The Worker owns OTP generation,
storage, verification and email delivery. Cloudflare D1 holds the temporary
OTP records and all application data. Using D1 keeps the Worker free of the
Firestore client, whose gRPC transport is not compatible with Workers.

---

## 1. Architecture

| Concern | Owner | Notes |
|---|---|---|
| Password storage | Firebase Auth | Never handled by our code |
| Email verification | This system | 6 digit OTP, not Firebase's link |
| OTP storage | Cloudflare D1 `email_otps` | Hash + pepper, plaintext never stored |
| OTP delivery | Resend | `hello@genericpcs.com` |
| Session tokens | D1 `user_sessions` | Opaque 32 byte random tokens |
| Media storage | Cloudflare | Unchanged, served from `public/` |

### OTP lifecycle

1. `POST /api/auth/send-otp` — verifies the Firebase ID token, confirms the
   account exists and is not yet verified, generates a six digit code, hashes
   it with the server pepper, stores it in D1 with a five minute
   expiry, and emails it through Resend.
2. The user enters the code on `/verify-otp`.
3. `POST /api/auth/verify-otp` — verifies the ID token, re-hashes the
   submitted code, compares in constant time, enforces the five attempt
   limit, consumes the record, then sets `emailVerified: true` on the
   Firebase account via the Admin SDK.
4. `POST /api/auth/resend-otp` — invalidates any previous code, applies the
   60 second cooldown, and sends a fresh code.

---

## 2. Security model

| Control | Implementation |
|---|---|
| Authentication | Firebase ID token verified on every protected endpoint |
| Never trust the browser | UID, email and verification status always come from the verified token |
| OTP generation | `crypto.getRandomValues()`, exactly six digits, leading zeros preserved |
| OTP storage | SHA-256 hash with `OTP_SECRET` pepper; plaintext never persisted |
| OTP lifetime | 5 minutes |
| Attempt limit | 5 incorrect submissions, then the record is destroyed |
| Resend cooldown | 60 seconds per user |
| Replay protection | The record is deleted on successful verification |
| Concurrency | Atomic SQL `UPDATE ... WHERE attempts < 5` so parallel failures cannot skip the cap |
| Timing | Constant time hash comparison |
| CORS | Explicit allowlist, never `*`, unknown origins rejected with 403 |
| Enumeration | Responses are generic and never confirm whether an email exists |
| Logging | No OTP, token, key or email body is ever logged |

### Rate limiting

Cooldown and attempt limits are stored in D1, not in memory, because Workers
are stateless and distributed. Per IP rate limiting should be layered on at
the Cloudflare edge (WAF rule or Rate Limiting binding) if required.

---

## 3. Environment variables

### Worker secrets (`wrangler secret put`)

| Secret | Required | Purpose |
|---|---|---|
| `FIREBASE_CONFIG` | yes | Firebase project config **plus** service account key |
| `RESEND_API_KEY` | yes | Resend API key |
| `OTP_SECRET` | yes | Pepper for OTP hashing, at least 16 characters |

### Worker vars (`wrangler.toml`)

| Var | Optional | Purpose |
|---|---|---|
| `ALLOWED_ORIGINS` | yes | Extra allowed origins, comma separated |

### Frontend variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Worker API base URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web config |

> The Firebase web config is public by design and is safe to ship in the
> browser bundle. Only the **service account private key** must stay in the
> Worker secret.

---

## 4. Firebase configuration

### 4.1 Create the service account key

1. Firebase Console → make sure **the `genericpcs` project is selected** in
   the top project switcher
2. **Project Settings** → **Service Accounts**
3. **Generate new private key** → download the JSON
4. Never paste that JSON into a chat or a ticket. Hand it to the script:

```bash
node scripts/set-firebase-secret.mjs ~/Downloads/genericpcs-firebase-adminsdk-xxxxx.json
```

The script refuses to proceed if `project_id` in the file does not match
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`.

### 4.2 Build the `FIREBASE_CONFIG` value

The Worker accepts either camelCase or the snake_case field names from the
downloaded JSON, and restores escaped newlines inside the private key.

```json
{
  "apiKey": "AIza...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "1234567890",
  "appId": "1:1234567890:web:abcdef123456",
  "clientEmail": "firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com",
  "privateKey": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
}
```

### 4.3 Enable the sign-in providers

Firebase Console → **Authentication** → **Sign-in method**:

- **Email/Password** → enable
- Turn **off** "Email link (passwordless sign-in)" — this system replaces it

### 4.4 Cloudflare D1

All application data lives in D1. The schema is defined in `schema.sql` and
the OTP migration in `migrations/0001_firebase_otp.sql`.

```bash
# Create the database if it does not exist
cd worker
npx wrangler d1 create generic-pcs

# Apply the base schema, then the Firebase/OTP migration
npx wrangler d1 execute generic-pcs --config wrangler.toml --remote --file=schema.sql
npx wrangler d1 execute generic-pcs --config wrangler.toml --remote --file=migrations/0001_firebase_otp.sql
```

---

## 5. Cloudflare configuration

The API Worker lives in `worker/` and is deployed independently of the Next.js
app.

```bash
# 0. Check which secrets are already set (names only, never values)
cd worker && npm run secrets:list && cd ..
```

```bash
# 1. Install dependencies
npm install

# 2. Set the Worker secrets (you will be prompted for each value)
cd worker
npm run secret:FIREBASE_CONFIG   # or: npx wrangler secret put FIREBASE_CONFIG
npm run secret:RESEND_API_KEY
npm run secret:OTP_SECRET
cd ..

# 3. Optional: allow extra origins
#    ALLOWED_ORIGINS = "https://staging.genericpcs.com"  in worker/wrangler.toml

```bash
# 4. Apply payment migration 0012 (bank accounts + proof; 0011 already applied)
cd worker
npm run db:migrate
cd ..

# 5. Deploy the API Worker
cd worker
npm run deploy
cd ..

# 6. Deploy the Next.js site
npm run build
npx opennextjs-cloudflare deploy
```

> **Always pass `--config wrangler.toml`** when running wrangler from inside
> `worker/`. Without it, wrangler can pick up the repository root
> `wrangler.jsonc` and deploy the wrong Worker. The `npm run deploy` script
> already includes the flag.

### Custom API domain

```bash
cd worker
npx wrangler deploy --config wrangler.toml --routes auth.genericpcs.com
```

Then add a CNAME for `auth.genericpcs.com` to the Worker in the Cloudflare
dashboard. Use this as `NEXT_PUBLIC_API_BASE_URL`:

```
NEXT_PUBLIC_API_BASE_URL=https://auth.genericpcs.com
```

### Local development

```bash
# API worker
cd worker && npm run dev

# Next.js site (separate terminal)
npm run dev
```

For local secrets, create `worker/.dev.vars`:

```
FIREBASE_CONFIG={"projectId":"...","clientEmail":"...","privateKey":"..."}
RESEND_API_KEY=re_xxx
OTP_SECRET=a-long-random-string
```

---

## 6. Verify the setup

Hit the diagnostics endpoint. It reports presence and connectivity only — it
never returns a secret.

```bash
curl -s https://auth.genericpcs.com/api/auth/config-check | jq
```

```json
{
  "ok": true,
  "firebase": {
    "configured": true,
    "projectId": "your-project",
    "serviceAccountPresent": true,
    "reachable": true,
    "error": null
  },
  "resend": { "configured": true },
  "otpSecret": { "configured": true, "lengthOk": true },
  "origins": []
}
```

`ok: true` means every dependency is wired correctly.

---

## 7. API contract

Base URL: `https://auth.genericpcs.com`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/send-otp` | Firebase ID token | Generate and email a code |
| `POST` | `/api/auth/verify-otp` | Firebase ID token | Verify a code and mark the email verified |
| `POST` | `/api/auth/resend-otp` | Firebase ID token | Invalidate and re-send a code |
| `GET` | `/api/auth/status` | `Authorization: Bearer <idToken>` | Current verification status |
| `GET` | `/api/auth/config-check` | none | Configuration diagnostics |

### Payments (manual card / crypto / wire)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/checkout` | User session | Create checkout (`card` / `crypto` / `wire`) |
| `GET` | `/api/checkout/:id` | User session | Poll session status + payment instructions |
| `POST` | `/api/checkout/:id/card` | User session | Submit masked card summary → `submitted` |
| `POST` | `/api/checkout/:id/confirm` | User session | Crypto/wire “I sent payment” → `submitted` |
| `POST` | `/api/checkout/:id/proof` | User session | Submit proof (tx hash / ref) → `submitted` |
| `GET` | `/api/wallets` | none | Active crypto wallets for checkout |
| `GET` | `/api/admin/wallets` | Admin | List all wallets |
| `POST` | `/api/admin/wallets` | Admin | Create wallet |
| `PATCH` | `/api/admin/wallets/:id` | Admin | Update / toggle wallet |
| `DELETE` | `/api/admin/wallets/:id` | Admin | Delete wallet |
| `GET` | `/api/admin/bank-accounts` | Admin | List wire bank accounts |
| `POST` | `/api/admin/bank-accounts` | Admin | Create bank account |
| `PATCH` | `/api/admin/bank-accounts/:id` | Admin | Update bank account |
| `DELETE` | `/api/admin/bank-accounts/:id` | Admin | Delete bank account |
| `POST` | `/api/admin/orders/:id/wire-details` | Admin | Send bank details → customer `awaiting_payment` |
| `POST` | `/api/admin/orders/:id` (status `paid`) | Admin | Approve → receipt email to customer |

Status flow: `pending → awaiting_payment → [awaiting_admin] → submitted → paid | failed | expired` (wire starts at `awaiting_admin` and emails admins). TTLs: card 15 min, crypto 30 min, wire 48 h.

### Send

```jsonc
// POST /api/auth/send-otp
{ "idToken": "<firebase id token>" }
```

```jsonc
// 200
{
  "success": true,
  "message": "A verification code is on its way to your inbox.",
  "expiresInSeconds": 300,
  "resendAfterSeconds": 60
}
```

```jsonc
// 429 — cooldown
{
  "error": "Please wait 42 seconds before requesting another code.",
  "code": "cooldown",
  "cooldown": true,
  "retryAfter": 42
}
```

### Verify

```jsonc
// POST /api/auth/verify-otp
{ "idToken": "<firebase id token>", "otp": "042193" }
```

```jsonc
// 200
{ "success": true, "verified": true }
```

```jsonc
// 400
{
  "error": "That code is not correct.",
  "code": "invalid_otp",
  "attemptsRemaining": 4
}
```

Possible `code` values: `invalid_otp`, `expired`, `max_attempts`,
`not_found`.

### Status

```jsonc
// GET /api/auth/status   Authorization: Bearer <idToken>
{
  "emailVerified": false,
  "hasPendingOTP": true,
  "expiresIn": 268412,
  "attempts": 0,
  "lastSentAt": "2026-01-01T12:00:00.000Z",
  "cooldownSeconds": 0
}
```

---

## 8. Manual testing with curl

```bash
API="https://auth.genericpcs.com"
TOKEN="<firebase id token>"

# Configuration health
curl -s "$API/api/auth/config-check" | jq

# Send a code
curl -s -X POST "$API/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"idToken\":\"$TOKEN\"}" | jq

# Cooldown check (run twice quickly)
curl -s -X POST "$API/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"idToken\":\"$TOKEN\"}" | jq

# Wrong code
curl -s -X POST "$API/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"idToken\":\"$TOKEN\",\"otp\":\"000000\"}" | jq

# Status
curl -s "$API/api/auth/status" \
  -H "Authorization: Bearer $TOKEN" | jq

# Correct code
curl -s -X POST "$API/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"idToken\":\"$TOKEN\",\"otp\":\"042193\"}" | jq

# Reuse the same code (must fail)
curl -s -X POST "$API/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"idToken\":\"$TOKEN\",\"otp\":\"042193\"}" | jq

# Missing token (must be 401)
curl -s -X POST "$API/api/auth/send-otp" \
  -H "Content-Type: application/json" -d '{}' | jq

# Disallowed origin (must be 403)
curl -s -X POST "$API/api/auth/send-otp" \
  -H "Origin: https://evil.test" \
  -H "Content-Type: application/json" \
  -d "{\"idToken\":\"$TOKEN\"}" | jq
```

---

## 9. Frontend integration

### Getting a Firebase ID token

`src/lib/firebase-client.ts` wraps the Firebase web SDK:

```ts
import { getIdToken, sendOtp, verifyOtp } from "@/lib/firebase-client";

const idToken = await getIdToken();
await sendOtp(idToken);
await verifyOtp(idToken, "042193");
```

### Registration flow

`src/components/AuthForm.tsx`:

1. `signUpWithEmail(email, password, name)` creates the Firebase account with
   `emailVerified: false`.
2. The Worker session endpoint issues the site session token.
3. `sendOtp(idToken)` triggers the email.
4. `router.push("/verify-otp")` sends the user to the verification screen.

### Verification screen

`src/app/(auth)/verify-otp/page.tsx` provides:

- Six separate inputs with automatic focus progression
- Backspace navigation, arrow key navigation and paste support
- Live expiry countdown
- 60 second resend cooldown
- Attempts remaining
- Auto submission once six digits are entered
- Loading, error and success feedback

---

## 10. Tests

```bash
npm test              # 42 tests
npm run test:watch
npm run typecheck        # Next.js app
npm run typecheck:worker # Worker
```

Coverage:

| File | Focus |
|---|---|
| `worker/tests/otp.test.ts` | Generation, hashing, comparison, policy constants |
| `worker/tests/config.test.ts` | `FIREBASE_CONFIG` parsing, including snake_case and base64 |
| `worker/tests/email.test.ts` | Template structure, branding, expiry and security notice |
| `worker/tests/cors.test.ts` | Origin allowlist, wildcard protection, localhost rules |

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `config-check` reports `FIREBASE_CONFIG is not set` | Secret missing | `wrangler secret put FIREBASE_CONFIG` |
| `config-check` reports `missing clientEmail/privateKey` | Web config pasted instead of a service account key | Add `client_email` and `private_key` from the downloaded JSON |
| `FIREBASE_CONFIG could not be parsed` | Malformed JSON | Paste the raw JSON, or base64 encode it |
| `Invalid Firebase ID token` | Expired token | Call `getIdToken(null, true)` to force a refresh |
| No email arrives | Sender not verified in Resend | Verify `hello@genericpcs.com` in Resend |
| `Email service is not configured` | `RESEND_API_KEY` missing | `wrangler secret put RESEND_API_KEY` |
| `Origin not allowed` | Origin missing from the allowlist | Add it to `ALLOWED_ORIGINS` |
| `Origin not allowed` on localhost | Localhost port not matched | Use `http://localhost:<port>` exactly |
| `no such table: email_otps` | Migration not applied | Run `migrations/0001_firebase_otp.sql` |

---

## 12. Files

| File | Purpose |
|---|---|
| `worker/src/auth.ts` | Firebase Admin setup, OTP primitives, D1 OTP storage |
| `worker/src/email.ts` | Resend delivery and the HTML template |
| `worker/src/cors.ts` | Origin allowlist and CORS headers |
| `worker/src/config-check.ts` | Configuration diagnostics |
| `worker/src/index.ts` | Routing and the OTP endpoints |
| `worker/src/account.ts` | Registration, login, profile and order endpoints |
| `worker/src/types.ts` | `Env` bindings and shared types |
| `src/lib/firebase-client.ts` | Firebase web SDK wrapper and OTP API client |
| `src/app/(auth)/verify-otp/page.tsx` | OTP verification interface |
| `src/components/AuthForm.tsx` | Registration and sign-in form |
