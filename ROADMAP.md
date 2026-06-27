# CircuitVision — Feature Roadmap

Living document of what's built, what's queued, and what's deferred.
Last updated: 2026-06-27.

---

## ✅ Done

### Core marketplace
- **Auth** — register / login / me, JWT Bearer tokens.
- **Email verification + password reset** — hashed, single-use tokens with expiry; mock mailer (logs + returns a `devLink` when no SMTP); app-wide verify banner, `/verify`, `/forgot`, `/reset`. Sensitive auth routes are rate-limited.
- **Roles** — customer / seller / admin (chosen at signup; sellers can also buy; admin seeded or promoted). Admin can promote customer → seller.
- **Profile customization** — avatar, bio, accent colour; cached seller rating.
- **Listings** — full CRUD: create (multipart + Cloudinary), browse, owner update, **soft delete** (with Cloudinary cleanup when unreferenced). Image gallery on detail + edit-time photo management. 30-day expiry + one-click repost.
- **Search & filter** — live/debounced, case-insensitive partial match; sort by newest / price / most-viewed; paginated ("Load more").
- **Wallet** — mock PHP balance, top-ups, `walletTransactions` audit log.
- **Orders** — full lifecycle (place → pay → verify → prepare → ship → complete; + cancel/dispute) with **escrow**: funds stay reserved until the buyer confirms completion, then settle to the seller. Multi-quantity stock tracked across the lifecycle.
- **Money atomicity** — wallet + order flows run in MongoDB transactions where supported, with a safe standalone-mongo fallback.

### Engagement & discovery
- **Seller storefronts** — public `/sellers/:id` with profile + ratings + listings; ratings surfaced on cards and the spotlight.
- **Wishlist / favorites** — heart on cards, Saved page, nav badge.
- **Catalog highlights** — best-sellers & trending carousels + an auto-rotating product Spotlight on Browse.
- **Seller dashboard** — revenue, escrow, units, views, 7-day trend, top listings.
- **Reviews** — 1–5★ + comment after a completed order; seller average cached.
- **In-app notifications** — order / message / review / dispute events.
- **Messaging** — 1:1 buyer/seller conversations (optionally listing-anchored), unread badges.

### Admin & platform
- **Admin module** — moderation queue, ban/unban, role change, wallet adjust, all orders/transactions, **platform analytics** (GMV, 7-day revenue trend, top sellers).
- **Dispute resolution** — raise + threaded messages + admin resolve (refund / partial / release / reject), splitting the still-escrowed funds.

### Apps, infra & quality
- **Web** — Rev.A "Populated Board" design, GSAP/Framer Motion, mobile-first + Capacitor wrap.
- **Mobile (Expo SDK 54 / expo-router)** — buyer/seller flows in Expo Go (auth, browse, buy, orders, wallet, messaging, disputes).
- **Seed** — `npm run seed` loads demo accounts (password `Password123`), listings, completed orders, reviews, and ratings so every surface is populated.
- **Tests + CI** — `npm test` (node:test) covers the pure order-lifecycle logic; GitHub Actions runs server tests + client build on push/PR.

---

## 🗂 Queued / next

- **Mobile parity** — bring this iteration's web features to the Expo app (search/sort, edit/delete, dashboard, favorites, storefronts, profile, auth pages). Admin remains web-only.
- **Deeper test coverage** — integration tests for the wallet/order flows (needs a test database, e.g. mongodb-memory-server).
- **Client code-splitting** — route-level lazy loading to shrink the initial bundle.

---

## ⏸ Deferred

- **Real SMTP transport** — the mock mailer stands in; a real provider drops into `services/mailService.js` with no call-site changes.

---

## 🔬 Roboflow component scanning — done (behind config)

Auto-classify a photographed component into a category on the create-listing
form, via a Roboflow **workflow** inference server.

- Server `POST /api/scan` (seller/admin) → `services/roboflowService.js` posts
  the image (base64) to `{ROBOFLOW_API_URL}/infer/workflows/{workspace}/{workflowId}`
  → `{ suggestedCategory, confidence }`. Output parsing is defensive (the
  workflow's output shape varies); the raw output is returned in dev.
- Client: `CreateListing` scans the first photo on select and pre-fills the
  category at ≥0.4 confidence, with manual override. esp32 / raspi / arduino,
  else null ⇒ user picks.
- Enabled when `ROBOFLOW_API_KEY` is set (with `ROBOFLOW_API_URL`,
  `ROBOFLOW_WORKSPACE`, `ROBOFLOW_WORKFLOW_ID`); disabled ⇒ manual selection.
