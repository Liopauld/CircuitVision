# CircuitVision

A student-focused marketplace for electronic components — **ESP32**,
**Raspberry Pi**, and **Arduino** boards, modules, and accessories. Browse,
buy, and sell with a mock in-app wallet, role-based access, and an admin
console. Built React-first so it can be wrapped into a native mobile app.

## Stack

| Layer    | Tech                                                 |
| -------- | ---------------------------------------------------- |
| Frontend | React 18 + Vite, React Router, **Framer Motion**     |
| Mobile   | **Capacitor** (wrap the web app into iOS/Android)    |
| Backend  | Node + Express (ES modules)                          |
| Database | MongoDB via Mongoose                                 |
| Auth     | JWT (Bearer tokens) + role-based middleware          |
| Images   | Cloudinary (URL-only stored in Mongo; falls back to a placeholder if unset) |

```
CircuitVision/
├── server/   # Express API
└── client/   # Vite + React SPA (+ Capacitor config)
```

## Roles

| Role         | Can do                                                       |
| ------------ | ------------------------------------------------------------ |
| **customer** | Browse, buy, top up wallet, track orders                     |
| **seller**   | Everything a customer can, **plus** create & manage listings |
| **admin**    | Approve/reject listings, ban users, adjust wallets, view all orders & wallet activity, reports |

Role is chosen at signup (customer or seller). Admins are created by the seed
script or by promotion — never via public signup.

## Setup

### 1. Backend

```bash
cd server
cp .env.example .env        # edit MONGO_URI, JWT_SECRET, CLOUDINARY_* (optional)
npm install
npm run seed                # OPTIONAL: wipe + load demo accounts and listings
npm run dev                 # http://localhost:4000
```

`.env` keys: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`,
and optionally `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` /
`CLOUDINARY_API_SECRET`. Without Cloudinary, image uploads return a placeholder
URL so the app still works end-to-end.

### 2. Frontend

```bash
cd client
cp .env.example .env        # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                 # http://localhost:5173
```

### Demo accounts (after `npm run seed`)

All use password **`Password123`**:

| Role     | Email                        |
| -------- | ---------------------------- |
| admin    | `admin@circuitvision.test`   |
| seller   | `seller@circuitvision.test`  |
| seller   | `maker@circuitvision.test`   |
| customer | `customer@circuitvision.test`|

The seed loads ~12 listings across all three categories (one left **pending**
so the admin moderation queue has something to review).

## The buy / wallet flow

Each account has a mock PHP wallet (top up any time — no real gateway).

```
Buyer places order ──► funds RESERVED (held) from wallet, listing → reserved
   │
   ├─ Buyer: "Pay now"        → Payment Submitted
   │     └─ Seller: "Verify"  → Payment Verified  (reserved → credited to seller)
   │           └─ Seller: Preparing → Ready/Shipped
   │                 └─ Buyer: "Confirm received" → Completed (listing → sold)
   └─ Cancel (before verify)  → reserved funds released back to buyer
```

Every movement is logged to `walletTransactions` (top_up / reserve / release /
debit / credit / refund / adjustment) and visible in the Wallet history and the
admin Activity tab.

## API

| Method | Endpoint                          | Auth        | Purpose                          |
| ------ | --------------------------------- | ----------- | -------------------------------- |
| POST   | `/api/auth/register`              | —           | Create account (role: customer\|seller) |
| POST   | `/api/auth/login`                 | —           | Log in → JWT                     |
| GET    | `/api/auth/me`                    | any         | Current user                     |
| GET    | `/api/listings`                   | —           | Browse (filters: q, category, condition, minPrice, maxPrice, status) |
| GET    | `/api/listings/:id`               | —           | Single listing                   |
| GET    | `/api/listings/mine`              | any         | Caller's listings                |
| POST   | `/api/listings`                   | **seller**  | Create listing (multipart)       |
| PATCH  | `/api/listings/:id`               | owner       | Update / change status           |
| GET    | `/api/wallet`                     | any         | Balance + reserved               |
| POST   | `/api/wallet/topup`               | any         | Simulated top-up                 |
| GET    | `/api/wallet/transactions`        | any         | Wallet history                   |
| POST   | `/api/orders`                     | any         | Place an order (reserves funds)  |
| GET    | `/api/orders?role=buyer\|seller`  | any         | Your orders                      |
| GET    | `/api/orders/:id`                 | participant | Order detail + timeline          |
| POST   | `/api/orders/:id/actions`         | participant | Drive lifecycle (`{ action }`)   |
| GET    | `/api/admin/stats`                | **admin**   | Reports                          |
| GET/POST | `/api/admin/listings…`          | **admin**   | Moderation (approve/reject/category) |
| GET/POST | `/api/admin/users…`             | **admin**   | List / ban / wallet adjust       |
| GET    | `/api/admin/orders`               | **admin**   | All orders                       |
| GET    | `/api/admin/transactions`         | **admin**   | All wallet activity              |

## Mobile app (Capacitor)

The React app is structured mobile-first (bottom tab bar, safe-area padding) and
is ready to wrap natively.

```bash
cd client
npm run build                       # produces dist/
npm run cap:add:ios                 # one-time (needs Xcode); or cap:add:android (needs Android Studio)
npm run cap:sync                    # build + copy web assets into native projects
npx cap open ios                    # open in Xcode / Android Studio to run
```

Config lives in `client/capacitor.config.json` (app id `ph.circuitvision.app`).
Native-only touches (status bar, haptics) are in `client/src/native.js` and are
no-ops on the web.

> **Important for devices:** a phone can't reach `localhost`. Point
> `VITE_API_URL` at your machine's LAN IP (e.g. `http://192.168.1.10:4000/api`)
> or a deployed API before building for a real device.

## Verifying it works

1. `npm run seed` then `npm run dev` (server) + `npm run dev` (client).
2. Log in as `customer@circuitvision.test` → top up the wallet → buy a listing →
   step the order through its lifecycle from both buyer and seller accounts.
3. Log in as `seller@circuitvision.test` → create a listing (lands as pending).
4. Log in as `admin@circuitvision.test` → Admin console → approve the pending
   listing, view stats, orders, and wallet activity.

## Roadmap

- **Roboflow scanning** — classify a photographed component (deferred).
- Messaging between buyers and sellers.
- Email verification & password recovery.
- Dispute resolution UI on top of the existing `disputed` order state.
