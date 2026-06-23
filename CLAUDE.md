# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CircuitVision is a student-focused marketplace for electronics components (ESP32 / Raspberry Pi / Arduino). It's a school project. Monorepo with two independent npm packages: `server/` (Express + Mongoose API, ES modules) and `client/` (Vite + React SPA, wrappable into iOS/Android via Capacitor). Tracked in git on the `main` branch, pushed to GitHub at `Liopauld/CircuitVision`.

## Version control workflow — commit and push as you work

This project is backed by GitHub specifically so no work is ever lost and any change can be reverted. As you complete a meaningful unit of work, **commit it and push to `origin/main`** — do not leave finished work sitting uncommitted.

- After each logical change (a feature, fix, or refactor that leaves the tree in a working state), run `git add -A && git commit && git push`.
- Write **clean, descriptive commit messages**: a concise imperative subject line (e.g. "Add buyer order cancellation"), and a body explaining the *why* when it isn't obvious. One commit per logical change — don't bundle unrelated edits.
- Never commit secrets or generated files. `.env`, `node_modules/`, `dist/`, and `.claude/settings.local.json` are already in `.gitignore`; keep it that way.
- The repo is **public** — never hardcode credentials in source.
- To undo a change later, prefer `git revert <commit>` (keeps history) over destructive resets.

## Commands

There is no test runner, linter, or build step for the server — it runs directly with Node's native `--watch`.

```bash
# Server (cd server)
npm run dev      # node --watch src/index.js → http://localhost:4000
npm start        # node src/index.js (no watch)
npm run seed     # WIPES the DB and loads demo accounts + ~12 listings

# Client (cd client)
npm run dev      # vite → http://localhost:5173
npm run build    # vite build → dist/
npm run cap:sync # build + copy web assets into native projects
```

Each package has its own `.env` (copy from `.env.example`). Server reads `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`, and optional `CLOUDINARY_*`. Client reads `VITE_API_URL` (must point at the LAN IP or a deployed API for real mobile devices — a phone can't reach `localhost`).

Demo accounts after seeding all use password `Password123` (e.g. `admin@circuitvision.test`, `seller@circuitvision.test`, `customer@circuitvision.test`).

## Architecture

### Server layering

Strict request flow: `routes → middleware (requireAuth/requireRole/upload) → controllers → services/models`. Conventions to follow when adding code:

- **Errors:** throw `new ApiError(status, message)` (from `middleware/errorHandler.js`) anywhere; never `res.status().json()` an error directly. Every async controller is wrapped in `asyncHandler` at the route level so throws are caught and routed to the central `errorHandler`. The client reads errors from `{ error: "..." }`.
- **Auth:** `requireAuth` puts `{ id, role }` on `req.user` from the Bearer JWT. `requireRole(...roles)` gates seller/admin routes and must run after `requireAuth`.
- **Config:** all env access goes through `config/env.js` (which provides defaults). Do not read `process.env` elsewhere.

### Money is the core domain — never mutate balances by hand

All wallet movement goes through `services/walletService.js`, which is the **only** place that writes `User.walletBalance` / `User.reservedBalance` and is paired 1:1 with a `WalletTransaction` audit record (every transaction stores `balanceBefore`/`balanceAfter`). Use these helpers; don't `user.walletBalance += x` in a controller:

- `applyBalanceChange(user, {...delta})` — top_up / credit / debit / refund / adjustment on spendable balance.
- `moveToReserved` / `releaseReserved` — soft-hold funds between spendable and `reservedBalance`.
- `settlePayment(buyer, seller, amount, orderId)` — finalize: clear buyer's reserve (debit) and credit seller.

### Order lifecycle is a single transition table

`controllers/orderController.js` defines `TRANSITIONS` — a declarative map of `action → { from: [validStatuses], by: [allowedActors], to: newStatus }`. `transitionOrder` validates actor + current status against this table, then runs side effects keyed on the destination status (e.g. entering `payment_verified` calls `settlePayment`; `cancelled` releases reserved funds and frees the listing; `completed` marks the listing `sold`). **Add new order behavior by editing the transition table and its side-effect block, not by adding ad-hoc endpoints.** Actor is computed per-request via `actorFor()` as `buyer` / `seller` / `admin`.

Flow: `awaiting_payment → payment_submitted → payment_verified → preparing → ready → completed`, plus `cancel` (before verify) and `dispute`. Placing an order reserves funds and flips the listing to `reserved`.

### Images / Cloudinary are optional by design

`config/env.js` exposes `cloudinaryEnabled` (true only if all three creds present). When false, the upload helper returns a placeholder URL so the whole app runs end-to-end without a Cloudinary account. Only the image **URL** is stored in Mongo. Don't add hard dependencies on Cloudinary being configured.

### Client

- `src/api/client.js` is the single axios instance: a request interceptor attaches the JWT from `localStorage` (`cv_token`), and a response interceptor on `401` clears the token and dispatches a `cv:unauthorized` window event (decouples API layer from `AuthContext`). Use `apiError(err)` to extract a display message.
- `context/AuthContext.jsx` holds the current user; `components/ProtectedRoute.jsx` gates routes (optionally by `roles`). Route table lives in `App.jsx`.
- Mobile-first: bottom `TabBar`, Framer Motion page transitions (`PageTransition` + `AnimatePresence` keyed on pathname). Native-only touches (status bar, haptics) live in `src/native.js` and are no-ops on web.

## Status / gotchas

- **Messaging backend exists but is not surfaced in the client.** `routes/message.routes.js`, `messageController.js`, and the `Conversation`/`Message` models are wired into the API, but there are no client routes/pages for it yet. (Project notes list messaging as "deferred" — the server stubs are ahead of the UI.)
- Roles are chosen at signup (customer or seller); admins exist only via the seed script or promotion, never public signup. Sellers can also buy.
- Deferred / not built: Roboflow component scanning, email verification & password recovery, dispute-resolution UI on top of the existing `disputed` order state.
