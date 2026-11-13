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
npm run db:init                           # applies schema.sql to D1
npx wrangler secret put BACHS_API_KEY
npx wrangler secret put BACHS_API_BASE
npm run deploy
```

`BACHS_API_KEY` / `BACHS_API_BASE` are optional: without them the worker
generates its own instructions from the wallet/bank variables in
`wrangler.toml`, which keeps local development working. The endpoint paths are
vars (`BACHS_CRYPTO_PATH`, `BACHS_WIRE_PATH`) so they can be corrected without
touching code. `BACHS_WEBHOOK_SECRET` turns on HMAC verification for
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
