# generic pcs API (Cloudflare Worker)

Backend for the generic pcs storefront. Handles checkout sessions, the bachs payment
gateway (crypto and wire transfer), order storage and product registration.

## Stack

- Cloudflare Worker (runtime) — `src/index.ts`
- D1 — accounts, sessions, settings, orders, order lines and registrations
- KV — live checkout sessions
- bachs — the payment gateway adapter (`src/bachs.ts`)

## Routes

### Accounts

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account, return a bearer token |
| POST | `/api/auth/login` | Exchange email + password for a bearer token |
| POST | `/api/auth/logout` | Invalidate the current session |
| GET | `/api/me` | Read the signed-in profile |
| PATCH | `/api/me` | Update the profile (name, phone, country, postal code) |
| GET | `/api/me/orders` | Orders placed by the signed-in customer |
| GET | `/api/me/settings` | Read the notification and display settings |
| PATCH | `/api/me/settings` | Save the notification and display settings |
| GET | `/api/me/products` | Machines the customer registered |
| POST | `/api/me/products` | Register a machine and issue its label |
| DELETE | `/api/me/products/:id` | Remove a registered machine |

### Commerce

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness + provider check |
| POST | `/api/checkout` | Create a checkout session and return payment instructions |
| GET | `/api/checkout/:id` | Read a session (status, instructions, expiry) |
| POST | `/api/checkout/:id/submit` | Mark that the customer sent the payment |
| POST | `/api/registrations` | Issue a purchase label + tracking number |
| GET | `/api/orders?email=` | Order history for a customer |
| POST | `/api/webhooks/bachs` | Gateway callback — flips an order to `paid` |

Passwords are hashed with PBKDF2-SHA256 (100k iterations, per-user salt) and
sessions are random 32-byte tokens stored in `user_sessions` with a 30-day
expiry. Send the token as `Authorization: Bearer <token>`.

## Setup

### Auth

Wrangler needs either an OAuth session or an API token. If
`oauth.cloudflare.com` is unreachable from your network, use a token instead —
it only talks to `api.cloudflare.com`:

```bash
export CLOUDFLARE_API_TOKEN=<token>
export CLOUDFLARE_ACCOUNT_ID=d289dbc731c7695dd906f8bf8ea11dd1
```

The token needs Workers Scripts (Edit), Workers KV (Edit) and D1 (Edit).

### Resources

```bash
cd worker
npm install
npx wrangler d1 create generic-pcs            # then paste the id into wrangler.toml
npx wrangler kv namespace create SESSIONS # then paste the id into wrangler.toml
npx wrangler d1 execute generic-pcs --remote --file=./schema.sql
npx wrangler secret put BACHS_API_KEY
npx wrangler secret put BACHS_API_BASE
npm run deploy
```

`npx wrangler secret put` writes a secret and creates a new version of the
worker, so the script keeps running. Deploys must always point at this config
(`npx wrangler deploy --config worker/wrangler.toml`) — plain `wrangler deploy`
from the repo root picks up the storefront's `wrangler.jsonc` instead.

The worker also runs its own `CREATE TABLE IF NOT EXISTS` migration on the first
request of a cold isolate, so the API is usable even before the CLI migration
has been applied.

## bachs

Base URL: `https://sandbox-api.bachs.io` (`BACHS_API_BASE`).

| Purpose | Endpoint | Required scope |
| --- | --- | --- |
| Customer | `GET/POST /v1/customers` | `customers:read`, `customers:write` |
| Product | `GET/POST /v1/products` | `products:read`, `products:write` |
| Checkout session (crypto + wire) | `POST /v1/checkout-sessions` — `BACHS_CRYPTO_PATH`, `BACHS_WIRE_PATH` | `payments:write` |
| Confirm a session | `POST /v1/checkout-sessions/:id/confirm` | `payments:write` |

Both checkout paths are vars so they can be corrected without touching code. The
bachs key needs the scopes above; if a scope is missing the worker falls back to
the wallet/bank variables in `wrangler.toml` and returns a `gatewayWarning` on the
session so the storefront can show a notice instead of failing the checkout.

Two gateway rejections are translated into shopper-facing messages instead of a
generic failure:

- `EMAIL_NOT_DELIVERABLE` — the checkout email domain accepts no mail, so the
  customer is asked for another address.
- `DEPOSIT_LIMIT_EXCEEDED` — the order is above the account's per-payment
  limit; the response names both the order total and the limit. The sandbox
  account is capped at $5,000 per payment, so carts above that need splitting.

### Webhooks

`POST /api/webhooks/bachs` settles an order when bachs reports the payment.
The worker follows bachs's signing scheme:

| Header | Value |
| --- | --- |
| `X-Bachs-Timestamp` | Unix seconds |
| `X-Bachs-Signature` | HMAC-SHA256 hex of `"{timestamp}.{raw_body}"` |
| `X-Bachs-Signature-V2` | `t={timestamp},v1={signature}` — repeats `v1=` per live secret |

Set the shared secret with `npx wrangler secret put BACHS_WEBHOOK_SECRET` and
paste the same value into the bachs dashboard. Secrets are write-only, so the
worker cannot read the value back — that is why it has to be set from the CLI.

Verification accepts either signature header, rejects deliveries more than 300
seconds old or in the future, and — while no secret is configured — still
refuses to guess: a webhook only changes an order when its payload matches an
order we created, by the bachs checkout id (`orders.checkout_id`) or by the
order reference. Unknown ids are ignored (`{"ok": true, "matched": false}`).

Handled events: `checkout.completed` and `collection.succeeded` settle the
order (`paid`), `collection.failed` marks it `failed`. Both the live session in
KV and the order rows in D1 (including the customer's order history) are
updated.

## Frontend

Point the Next app at the worker:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://generic-pcs-api.<account>.workers.dev
```

Without that variable the app falls back to a local demo gateway that returns
the same session shape, so the checkout UI is fully usable offline.
