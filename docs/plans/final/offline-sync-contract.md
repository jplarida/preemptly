# Offline Sync / Replay Contract

> Part of the PreEmptly API final plan. See `00-README-index.md`. Cross-cutting — spans **mobile (Flutter)** and **backend (`api-core`)**. Resolves **GAP-02**.
> The backend contract for the offline-first order channel (RULE-OFFLINE-01/02). Both teams cite this doc; backend tasks are hooked into sessions 01/02/05/06/08.
> **Decisions confirmed 2026-07-19:** (a) the SMS is **advance-notice only** — the retailer never creates an order from it; the API order is always canonical. (b) offline windows can be **a week or more** — durable idempotency + queue-preserving re-auth are mandatory.

## The flow (what actually happens)

1. Consumer is offline, taps **Place Order**. The app: (a) writes the mutation to the SQLite `offline_queue` with a **client-generated UUIDv7 id** + a **client-generated idempotency key**, sets local status `PENDING_SMS`; (b) opens the SMS composer pre-filled so the retailer gets an immediate heads-up.
2. Device reconnects. The app **drains `offline_queue` in `created_at ASC`**, replaying each mutation as its normal REST call (`POST /v1/orders`, `PATCH /v1/orders/:id`, …) with the `Idempotency-Key` header.
3. The server dedups on the idempotency key, persists the canonical order (status = its real initial state, never `PENDING_SMS`), and returns the authoritative row. The app reconciles the local `PENDING_SMS` item to the returned order.

**The SMS is advance-notice only.** The retailer does **not** manually create an order from it — they wait for the synced API order. If the consumer never reconnects, that order simply never enters the system (accepted edge; the retailer still received the SMS and can fulfil physically, but there is no digital record, no estimation reset until a later refill is logged).

## Principles / locked decisions

1. **Canonical record = API order.** No server-side SMS↔API correlation or dedup (advance-notice model). Removes the hardest ambiguity.
2. **Client-generated UUIDv7 primary keys.** Offline-created entities get their id on-device; the server accepts client-supplied ids (insert-with-id / upsert). This eliminates temp-id→server-id remapping for dependent mutations *and* doubles as a natural dedup key. (Requires PKs to be client-suppliable UUIDs, not server autoincrement — a schema decision, session 01/05.)
3. **Durable idempotency, ≥30-day retention.** Because a queued mutation may replay a week+ later, idempotency records are **DB-backed** (Redis as an optional fast-path in front), keyed by **(userId, Idempotency-Key)**, storing the original response so a late replay returns the same result. Redis-TTL-only is insufficient. (Sharpens session 02's `idempotency.ts`.)
4. **Individual REST replay, no batch endpoint.** The client replays each queued mutation as its own normal call in `created_at ASC` order. No `/sync` endpoint — keeps the server simple, unchanged, and split-ready. Ordering + client-generated ids handle dependencies.
5. **`PENDING_SMS` never crosses the wire.** The client maps `PENDING_SMS` → a normal create on replay. The server **rejects the `PENDING_SMS` enum value on any write** (defense-in-depth per RULE-OFFLINE-01: "if you see it on the server, something went wrong").
6. **Conflict resolution = server validates the transition.** Creates are idempotent (no conflict). Updates created offline (e.g. cancel) may conflict with server state (order already delivered) → server returns **409/422**; the client marks that queue item **failed** and surfaces it ("this order was already delivered"). No silent last-write-wins on order state.
7. **Queue survives re-auth, bound to the creating user.** A week+ offline means the access token — and possibly the refresh token — expired. On reconnect: try refresh; if the refresh token is dead, force **OTP re-auth but DO NOT clear the queue**. Replay only if re-auth is the **same user** (same phone / `userId`); a different user must not drain another's queue (discard/block). Refresh-token lifetime is set ≥ the expected window so most cases skip re-auth.

## Cross-rule interactions to honour

- **RULE-ORDER-02 (discount locked at creation) × stale offline settings.** An offline order carries a discount the client computed from *cached* retailer settings that may be days stale. On replay the server **honours the client-locked discount if it is within the retailer's current configured bounds**, otherwise clamps/flags for retailer review. Record `clientCreatedAt` (when the consumer tapped Place Order) alongside the server `receivedAt`; discount lock references `clientCreatedAt` semantics, not sync time.
- **RULE-ORDER-01 / RULE-OFFLINE-01.** Single canonical DB status; `PENDING_SMS` is client-only and server-rejected (see principle 5).
- **RULE-OFFLINE-02.** Reads use cache-then-network (network-first for orders); only mutations replay. Drain the queue **before** refreshing caches on reconnect.

## Backend surface (what api-core builds — no new endpoint)

- **Durable idempotency middleware** (session 02): DB-backed store, (userId, key) scope, stores response, ≥30d retention; Redis fast-path optional.
- **Client-suppliable UUIDv7 PKs** on offline-creatable entities; create endpoints accept a supplied id and treat a repeat as idempotent (sessions 01 schema, 05 create semantics).
- **`PENDING_SMS` write-rejection** in the orders model's strict validation (session 05).
- **State-transition validation** on order updates → 409 on invalid (session 05).
- **Refresh-token lifetime ≥ offline window** + the re-auth-preserves-queue expectation documented on the auth flow (session 02).
- **Discount-bounds validation** of the client-locked amount on replay (session 05).

## Mobile surface (what the Flutter app must guarantee — for the app team)

- `offline_queue` row fields: `id` (UUIDv7, = entity id), `idempotencyKey`, `userId`, `endpoint/method`, `payload`, `clientCreatedAt`, `status` (pending|failed|synced), `attempts`, `dependsOn?`.
- Generate id + idempotency key **at mutation-creation time**, stable across all retries.
- Drain in `created_at ASC`; retry retryable failures (network/5xx) with backoff; quarantine non-retryable (4xx/409) as `failed` and surface to the user; fail dependents of a failed item fast.
- Preserve the queue across token refresh **and** OTP re-auth; only drain under the same `userId`.
- Map `PENDING_SMS` → normal create on replay; never send `PENDING_SMS` to the API.

## Verification (hooked into 05/06/08)

- **Dedup across the window:** replay a queued `POST /v1/orders` (same `Idempotency-Key`) after a simulated multi-day gap → **exactly one** order; the second call returns the stored response.
- **Dependency replay:** an offline `create asset` then `create order` referencing it replay in order via client ids → both land, correctly linked, no remapping.
- **Conflict:** cancel-while-offline of an order the retailer already delivered → replay returns **409**, queue item marked failed, surfaced.
- **`PENDING_SMS` guard:** a write carrying `PENDING_SMS` is rejected (400/422).
- **Re-auth survival:** expire both tokens, reconnect → OTP re-auth as the same user drains the queue; as a different user does not.
- **Discount staleness:** an offline order with a now-out-of-bounds locked discount is clamped/flagged, not silently trusted.

## Open sub-decisions

- Exact **refresh-token lifetime** (e.g. 30 / 60 / 90 days) — set in session 02 to comfortably exceed the expected window.
- Exact **idempotency retention** (default 30 days) and store (DB table vs Redis+DB).
- **Failed-item policy** nuance: stop-the-chain vs skip-independent-and-continue when a queued mutation fails (default: quarantine the item, fail only its dependents).
- Whether `clientCreatedAt` is trusted for anything beyond display + discount-lock semantics (default: no — server time is authoritative for everything security-sensitive).
