# CircuitVision — Feature Roadmap

Living document of what's built, what's being built now, and what's queued.
Last updated: 2026-06-24.

---

## ✅ Done & verified (Phases 1–2)

- **Auth** — register/login/me, JWT Bearer tokens.
- **Roles** — customer / seller / admin (chosen at signup; sellers can also buy; admin seeded only).
- **Listings** — create (multipart + Cloudinary), browse/search/filter, owner update.
- **Wallet** — mock PHP balance, top-ups, `walletTransactions` log (reserve/release/debit/credit/refund/adjustment).
- **Orders** — full lifecycle (place → pay → verify → prepare → ship → complete; + cancel/dispute) with wallet reserve/release/settle.
- **Admin module** — moderation queue, ban/unban, wallet adjust, stats, all orders/transactions.
- **Messaging** — 1:1 buyer/seller conversations (optionally anchored to a listing); Messages list + thread view, "Message seller/buyer" buttons on listing & order pages, unread badge in nav/tab bar with light polling.
- **UI** — electronics-themed neon/circuit design, Framer Motion animations, mobile-first + Capacitor wrap config.
- **Seed** — `npm run seed`; demo accounts password `Password123`.

---

## 🚧 In progress — High priority (this iteration)

### 1. Email verification + password reset
- **Approach:** token-based flow with a **mock mailer** — when no SMTP is configured the token/link is logged to the server console and returned in dev responses, mirroring the Cloudinary fallback pattern. A real mailer drops in later with zero call-site changes.
- **User fields:** verification token + expiry; reset token + expiry.
- **API:** request verification, verify, request password reset, reset with token.
- **Client:** "verify your email" banner + verify page, forgot-password + reset pages.
- **Why:** today any email string works and there's no account recovery.

---

## ✅ Recently shipped (Phase 3)

- **Dispute resolution UI** — Dispute + DisputeMessage records, admin resolve (refund/partial/release/reject) via `walletService.refundSettledPayment`, "raise a dispute" + thread on order detail, admin Disputes tab.
- **Seller ratings / reviews** — 1–5★ + comment after a completed order (1:1 with the order); seller average + reviews on listings.
- **In-app notifications** — order/message/review/dispute events, nav badge + page.
- **Listing expiry / repost** — 30-day live window on approval; stale listings hidden from browse; one-click repost.
- **Rev.A "Populated Board" web redesign** — soldermask/copper/silkscreen identity (replaced generic neon), Saira/JetBrains Mono type, GSAP hero + scroll reveal.
- **Mobile app (Expo SDK 54 / expo-router)** — runs in Expo Go; buyer/seller flows (auth, browse, buy, orders + actions, wallet, messaging, disputes). Admin still web-only.

## 🗂 Queued — Lower priority / operational

- **Admin: promote customer → seller** (no DB editing).
- **Pagination** on Browse and admin lists.
- **Cloudinary image deletion** when a listing is removed.

---

## ⏸ Deferred — Roboflow component scanning

**Status: pushed back — data gathering + model training in progress.**

Auto-classify a photographed component into a category on the create-listing
form. Deferred until the dataset is collected and a model is trained; the build
steps are documented and ready to wire in when the model ID is available.

**Plan when resumed:**
1. Roboflow **Classification** project, classes: `esp32`, `raspi`, `arduino`, `sensor`, `display`, `module`, `unknown`.
2. Collect 50–100 images/class (Shopee/Lazada listings, Roboflow Universe, own parts), label, train (Roboflow 3.0 fast).
3. Server `POST /api/scan` → hosted inference → `{ suggestedCategory, confidence }`; `sensor/display/module/unknown` or low confidence ⇒ user picks manually.
4. Client: auto-fill the category picker on image select in `CreateListing`.

Server env (when ready): `ROBOFLOW_API_KEY`, `ROBOFLOW_MODEL_ID`.
