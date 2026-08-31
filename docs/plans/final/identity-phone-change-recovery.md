# Identity, Phone Change & Recovery (plan)

> Part of the PreEmptly API final plan. See `00-README-index.md`. Resolves **GAP-22**. Auth is phone+OTP (RULE-AUTH-01), so the phone is the login credential — but PH prepaid SIM churn is high, so a number change/loss must not orphan the account.
> **Decisions (2026-07-19):** the **identity invariant is locked now** (must hold from sessions 01/02). The **phone-change flow** is *designed here but timing is TBD* ("review & planning for now"). **Lost-number recovery = pre-set recovery mechanism** (chosen).

## The day-1 invariant (lock now — RULE-AUTH-03 candidate)

> **`userId` is the stable identity (PK). Phone is a unique, *mutable* credential — never an identity or foreign key.** JWT **`sub = userId`** (not phone). Every ownership/tenancy FK (orders, tanks/assets, links, device tokens…) references `userId`. A number change is therefore a **one-column update** with all data intact.

This must be true from **session 01 (schema)** and **session 02 (JWT)** even though the change/recovery UX ships later — retrofitting phone-as-identity out of FKs after launch is expensive. (The current `api-elysia` may resolve identity by phone; `api-core` fixes this.)

## Phone change — user still HAS the old number (designed; timing TBD)

Flow:
1. Authenticated user requests a change to a new number.
2. **Verify both ends:** OTP the **new** number **and** re-verify the **old** (current valid session, or OTP the old number).
3. On both verified, **atomically swap the phone credential** on the same `userId`.
4. **Bump the token-version** (invalidate other outstanding sessions), **audit** the change, and **notify both** old and new numbers.
5. The old number is released (available to register fresh later).

## Lost-number recovery — pre-set recovery mechanism (chosen)

- **Enrollment (in advance):** at onboarding (and via settings), prompt the user to set up a **recovery credential** — a **recovery code (stored hashed, single-use)** and/or a **secondary contact**. Opt-in; adoption is typically low, so surface it clearly.
- **Recovery flow:** present the recovery credential **+ OTP the new number** → migrate the phone to the new number on the same `userId` → **force re-setup** of a fresh recovery credential → **heavy rate-limit + lockout** on attempts → **audit + alert**.
- Because adoption is imperfect, a **support-assisted manual path** stays as an out-of-band backstop (verify identity via recent orders / retailer link) — not the primary mechanism.

## Security

- **Number recycling (PH telcos recycle deactivated numbers):** an abandoned account on a recycled number could let the new SIM owner OTP in. Mitigations: the change flow **explicitly releases** the old number; **dormancy re-verification / step-up** challenges an OTP login into a long-inactive account; consider device binding for sensitive actions. *(Dormancy policy = open sub-decision.)*
- **Recovery code hygiene:** hashed at rest, single-use, rate-limited attempts → lockout, alert on use.
- **All identity changes audited** (append-only) and **both numbers notified**.

## Merge — out of scope (Phase 2)

If a user re-registered fresh on a new number and later recovers the old one, **merging two accounts** (orders/tanks/links) is **not** in scope. Recovery *migrates the number* on one `userId`; it does not merge.

## Backend surface / where it lands

- **Session 01 (schema):** `userId` stable PK; `phone` unique + mutable, no phone FKs; reserve recovery-credential fields (hashed code / secondary contact) as a seam.
- **Session 02 (auth):** JWT `sub = userId`; the phone-change + recovery endpoints (planned); token-version bump on change; audit events; recovery rate-limit reuses the session-02 limiter.
- **Ties:** erasure (GAP-06) crypto-shreds the phone but keeps the `userId` tombstone — consistent with this invariant.

## Verification (when the flows are built)

- **Change keeps identity:** after a phone change, `userId` and all owned data (tanks, orders, links) are unchanged; other sessions are invalidated; both numbers notified.
- **Recovery:** a pre-set recovery credential + new-number OTP migrates the number; a wrong recovery credential is rate-limited/locked out + alerted.
- **Recycling guard:** an OTP login into a long-dormant account triggers step-up re-verification.
- **Invariant:** no table uses `phone` as a FK/identity (review + grep gate).

## Open sub-decisions

- **Phase timing** for the change flow + the recovery UX ("review & planning" → schedule later).
- **Recovery credential type** — recovery code vs secondary contact vs both.
- **Dormancy re-verification policy** (inactivity threshold + step-up mechanism).
- Merge — deferred (Phase 2).
