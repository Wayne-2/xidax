# Admin Dashboard

The admin dashboard lives at `/admin` on the main site. Access is controlled
by a D1 allowlist of admin emails, checked on the server for every admin API
request against the verified Firebase ID token.

## Current status

| Section | Status |
|---|---|
| Orders | Implemented — list, filter, search, view detail, update status |
| Users | Implemented — list, filter, verification status, order/product counts |
| Admins | Implemented — add/remove admin emails from the dashboard |
| Products (CRUD + publish) | Planned — requires moving the catalog into D1 |

## 1. Giving a user admin access

Admins are managed from the dashboard itself — no CLI or Firebase console
required.

1. Sign in as an existing admin and go to **`/admin` → Admins**.
2. Type the email of the person you want to make an admin and click **Add admin**.
3. They get access on their very next request — no re-login needed.

The email must already have an account on the site (they need to sign up first).
To revoke access, click **Remove** beside their email. You cannot remove
yourself, and the last admin cannot be removed.

The allowlist lives in the D1 `admins` table (see `migrations/0002_admin_allowlist.sql`).

### Optional CLI provisioning

`scripts/set-admin.mjs` is kept for convenience but now writes to the D1
allowlist through the Worker API is preferred. The script sets a Firebase
custom claim, which the guard no longer relies on, so prefer the dashboard.

## 2. Verifying access

Sign in as the admin user, then visit:

```
https://genericpcs.com/admin
```

You should see the Orders dashboard. If you see "Admin access required", the
email is not on the allowlist (or you are signed in with a different account).

## 3. API contract (admin endpoints)

All require `Authorization: Bearer <Firebase ID token>` with the `admin: true`
claim. All return `403` for non-admins and `401` for missing/invalid tokens.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/orders` | List orders. Query: `status`, `search`, `limit`, `offset` |
| `GET` | `/api/admin/orders/stats` | Order count, revenue, counts by status |
| `GET` | `/api/admin/orders/:id` | Single order with line items |
| `PATCH` | `/api/admin/orders/:id/status` | Update status. Body: `{ "status": "paid" }` |
| `GET` | `/api/admin/users` | List users. Query: `search`, `verified`, `limit`, `offset` |
| `GET` | `/api/admin/users/stats` | User counts (total/verified/unverified) |
| `GET` | `/api/admin/users/:id` | Single user |
| `GET` | `/api/admin/admins` | List admin allowlist |
| `POST` | `/api/admin/admins` | Add admin. Body: `{ "email": "..." }` |
| `DELETE` | `/api/admin/admins/:email` | Remove admin |

Valid statuses:
`pending`, `awaiting_payment`, `submitted`, `paid`, `processing`, `shipped`,
`delivered`, `expired`, `failed`, `cancelled`, `refunded`.

Updating an order status also updates the matching `user_orders` row so the
customer's profile history stays in sync.

## 4. Security notes

- Authorization is enforced server-side in `worker/src/admin-auth.ts`: a
  verified Firebase ID token plus an email on the D1 `admins` allowlist. The
  UI hiding/showing is cosmetic — the API is the real gate.

- Login (`POST /api/auth/login`) expects a verified Firebase ID token, not a
  raw email/password. The client signs in with Firebase first.

- Email verification is required server-side for all `/api/me*` routes.

- Payment webhooks require `BACHS_WEBHOOK_SECRET` and carry an idempotency key.
- The email is read from the **verified** Firebase ID token and checked against
  the D1 `admins` table — never from anything the browser sends in a body or
  query parameter. This makes granting/revoking instant and unforgeable.
- The dashboard uses the Firebase client SDK (`getIdToken()`) to obtain the
  token for API calls, so no credentials are stored in the frontend.
- The admin route inherits the global providers from the root layout.

## 5. Products CRUD

Products live in the D1 `products` table (see `migrations/0003_products.sql`).
The prebuilds page reads published products from `GET /api/products`; the home
page "Featured Build" section is unchanged and still uses its own hardcoded
catalogue.

### Admin UI

Go to **`/admin` → Products**. The form captures exactly the fields shown on a
prebuild card:

| Card content | Form field |
|---|---|
| Name | Name |
| Specs line | Specs |
| Price / struck-through price / Save % | Price / Original price (discount auto-computed in the preview) |
| Flagship badge | Flagship badge checkbox |
| Image | Upload a new image (stored in R2) or type a path |
| — (hidden on card) | Brand (Intel/AMD), Stock, Featured, Published |

A live card preview updates as you type.

### Image uploads

Uploaded images are stored in the Cloudflare R2 bucket `genericpcs-media`
(bound as `MEDIA` in `worker/wrangler.toml`) and served through the Worker at:

```
/api/images/products/<uuid>.<ext>
```

The image endpoint sets long-lived immutable cache headers. Deleting a product
also removes its uploaded image from R2 (best effort). Max upload size: 10 MB;
allowed formats: PNG, JPEG, WebP, GIF, AVIF.

### Product endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/products` | Public — published products for the storefront |
| `GET` | `/api/images/:key` | Public — stream an uploaded image |
| `GET` | `/api/admin/products` | All products including drafts |
| `POST` | `/api/admin/products` | Create. Body = product fields |
| `GET` | `/api/admin/products/:id` | Single product |
| `PATCH` | `/api/admin/products/:id` | Update |
| `DELETE` | `/api/admin/products/:id` | Delete product + its image |
| `PATCH` | `/api/admin/products/:id/publish` | `{ "published": true|false }` |
| `POST` | `/api/admin/upload` | multipart/form-data field `file` |

### Empty state

When no products are published, the prebuilds page shows a "No products yet"
placeholder instead of the old hardcoded catalogue.

## 6. Individual product catalogs

The admin dashboard has three separate product sections:

| Tab | Route | Data source |
|---|---|---|
| **Prebuilds** | `/api/admin/products` | Structured `products` table |
| **Laptops** | `/api/admin/laptops` | `laptops` table (JSON documents) |
| **Consoles** | `/api/admin/consoles` | `consoles` table (JSON documents) |

Laptops and consoles store each product as a JSON document (migration
`0004_catalog_items.sql`). Their admin forms capture name, tagline,
description, price, badge, category, stock, up to three images, specs
(label/value pairs) and highlights, with a live card preview.

Public reads: `GET /api/laptops` and `GET /api/consoles` return published
items. The storefront falls back to the bundled catalogue when those tables
are empty, so the site is never blank. The prebuilds page intentionally shows
an empty state instead.

### Product image grid

Every product card (prebuild, laptop, console) renders its media as a grid:
one large image on the left and two stacked images on the right. Upload up to
three images in the admin form — the first is used as the large image. When
fewer images are provided, the artwork fallback fills the remaining tiles.

## 7. Hardening notes

### Session storage

The D1 session token is stored in `localStorage` (`generic-pcs.session`).
Moving it to an HttpOnly cookie was **not** done because the API Worker lives
on `generic-pcs-api.pcmarketweb.workers.dev` while the storefront is on
`genericpcs.com` — a cross-site cookie would need `SameSite=None; Secure` and
is subject to third-party cookie blocking, which could break sign-in.

If you later move the API to `api.genericpcs.com` (same site), HttpOnly cookies
become reliable and are recommended. Until then:
- no XSS sinks exist in the codebase (no `dangerouslySetInnerHTML`/`innerHTML`)
- tokens are cleared on sign-out and on 401 responses
- admin access has an additional server-side D1 allowlist gate

### Rate limiting

Abuse-prone endpoints are throttled via Cloudflare KV (`ratelimit:` keys):
login/register 15 per 5 min per IP, OTP send 10 per 5 min, checkout 10 per min,
registrations 10 per 5 min. OTP also has per-UID D1 attempt/cooldown limits.

### Checkout integrity

All amounts are recomputed server-side from D1 catalog prices in
`worker/src/pricing.ts`. Client-submitted prices and totals are ignored. The
two hardcoded landing-page builds have whitelisted prices until they are
migrated into the products table.

### Password reset / account deletion

- `/reset-password` sends a Firebase reset link.
- Profile → Delete account calls `POST /api/auth/delete` with a Firebase ID
  token and removes all D1 rows plus the Firebase user.
