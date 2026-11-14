# Pcmart API (Cloudflare Worker)

Backend for the Pcmart storefront. Handles checkout sessions, the bachs payment
gateway (crypto and wire transfer), order storage and product registration.

## Stack

- Cloudflare Worker (runtime) — `src/index.ts`
- D1 — orders, order lines and registrations
- KV — live checkout sessions
- bachs — the payment gateway adapter (`src/bachs.ts`)

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness + provider check |
| POST | `/api/checkout` | Create a checkout session and return payment instructions |
| GET | `/api/checkout/:id` | Read a session (status, instructions, expiry) |
| POST | `/api/checkout/:id/submit` | Mark that the customer sent the payment |
| POST | `/api/registrations` | Issue a purchase label + tracking number |
| GET | `/api/orders?email=` | Order history for a customer |

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
npx wrangler d1 create pcmart            # then paste the id into wrangler.toml
npx wrangler kv namespace create SESSIONS # then paste the id into wrangler.toml
npx wrangler d1 execute pcmart --remote --file=./schema.sql
npx wrangler secret put BACHS_API_KEY
npx wrangler secret put BACHS_API_BASE
npm run deploy
```

The worker also runs its own `CREATE TABLE IF NOT EXISTS` migration on the first
request of a cold isolate, so the API is usable even before the CLI migration
has been applied.

## bachs

Base URL: `https://sandbox-api.bachs.io` (`BACHS_API_BASE`).

| Purpose | Endpoint | Required scope |
| --- | --- | --- |
| Crypto charge (address + amount) | `POST /v1/payments/charges` — `BACHS_CRYPTO_PATH` | `payments:write` |
| Wire transfer instructions | `POST /v1/payments/transfers` — `BACHS_WIRE_PATH` | `transfers:write` |

Both paths are vars so they can be corrected without touching code. The bachs
key needs the scopes above; if a scope is missing the worker falls back to the
wallet/bank variables in `wrangler.toml` and returns a `gatewayWarning` on the
session so the storefront can show a notice instead of failing the checkout.

`BACHS_WEBHOOK_SECRET` turns on HMAC verification for
`POST /api/webhooks/bachs`, which flips an order to `paid` when bachs settles
it.

## Frontend

Point the Next app at the worker:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://pcmart-api.<account>.workers.dev
```

Without that variable the app falls back to a local demo gateway that returns
the same session shape, so the checkout UI is fully usable offline.
