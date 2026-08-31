# Data Privacy — Erasure & Retention (RA 10173)

> Part of the PreEmptly API final plan. See `00-README-index.md`. Cross-cutting compliance — resolves **GAP-06**. Primary home session 08; hooks in 02/03/05.
> **Decision confirmed 2026-07-19:** erasure model = **anonymize now, purge later.** On a consumer's RA 10173 erasure request, PII is anonymized immediately and each retailer's transaction records are retained (anonymized) for their books, then hard-purged once a statutory retention window lapses.

## The two-stage erasure lifecycle

1. **Stage 1 — anonymize (immediate, on request).** Consumer PII is stripped/crypto-shredded and purely-personal data is deleted; the identity on any retained record is replaced by an anonymized **tombstone** (a `user` row flagged `erased`, PII nulled, a stable anonymized id kept for referential integrity). The person is erased right away.
2. **Stage 2 — purge (deferred, scheduled).** A **retention-purge job** hard-deletes the now-anonymized transaction records once each record's **retention window** has lapsed. Data-minimizing: nothing is kept longer than the retailer's obligation requires.

## Crypto-shredding (how PII is anonymized)

- Sensitive columns (phone, name, address) are **encrypted at rest with a per-user data key** (this is session 08's "field/at-rest encryption for sensitive columns", specialized). **Anonymization = delete the per-user key** → PII becomes irrecoverable in **O(1)**, without rewriting every row.
- Non-encrypted personal data (device tokens, saved places/addresses, consumer profile fields) is **hard-deleted** at Stage 1.
- Crypto-shredding makes erasure **irreversible** and fast, and keeps referential integrity (the tombstone id survives).

## Cross-module fan-out (split-ready, no cross-module DB access)

Erasure is cross-cutting but must not reach into other modules' tables. An **`ErasureService`** (orchestrator — in `core-domain/identity` or a dedicated privacy capability) coordinates it by calling each module's `contract.ts`, which exposes an **`erase(userId)` / `anonymize(userId)`** operation that erases *only that module's* slice:

| Module | Erasure action |
|---|---|
| identity | crypto-shred/null PII, mark user `erased`, keep tombstone id |
| notifications | hard-delete `DeviceToken` |
| places (locations) | hard-delete saved addresses |
| service-request (orders) | **anonymize** customer identity; **retain** business fields (amount, date, tank size, status) for the retailer's books |
| refills | anonymize + retain (transactional) |
| prediction | delete derived `prediction_log` rows for the user (not a business record) |
| linking | sever/anonymize `CustomerRetailerLink` |

Coordinated at-least-once (synchronous contract calls, or an `ErasureRequested` event modules react to via the outbox). Emit `ErasureRequested` → `ErasureCompleted` for the audit trail.

## Audit-log reconciliation (append-only vs erasure)

The hash-chained, append-only audit log (session 03) **cannot** be edited/deleted without breaking the chain — and it doesn't need to be: **audit stores IDs and event types, never raw PII** (logging already scrubs PII, session 01). After Stage 1 the `userId` persists as an anonymized tombstone, so every audit reference stays valid and the chain stays intact, with **no PII lingering in audit**. The erasure itself is **audited** (a `ErasureCompleted` row is appended), never removed. *This is the load-bearing reason erasure and tamper-evident audit coexist — enforce "no PII in audit" as an invariant.*

## Multi-tenant handling

A consumer links to many retailers. Erasure anonymizes the **one person globally**; each linked retailer independently keeps its **own** anonymized transaction records (tenancy already prevents cross-retailer visibility). The retention-purge runs per-record against the applicable window, so retailers with different retention obligations purge independently.

## Data export (portability) & ordering

- The RA 10173 **export** endpoint (session 08) returns the consumer's full data (profile, orders, refills, links) as a portable dump. Independent of erasure.
- The UI should **offer export before erasure**; erasure does not require a prior export but is irreversible, so the confirmation flow must make that clear.

## Retention-purge job (reuses GAP-05 single-runner)

- A **scheduled, single-runner** job (the exact Redis-lock/BullMQ/CronJob mechanism from GAP-05 / session 03) scans anonymized records whose retention window has lapsed and **hard-deletes** them. Idempotent handler.
- **In-flight guard:** erasure requires **no active/in-flight orders** for the consumer (or defers PII anonymization on records tied to an in-flight order until it reaches a terminal state) — so a delivery in progress isn't broken mid-flow.

## Backend surface (what api-core builds)

- `ErasureService` orchestrator + per-module `erase/anonymize` contract ops (session 05).
- Per-user-key **crypto-shred** encryption for PII columns (session 08, key management in the encryption design).
- **Export** + **erase** endpoints (session 08).
- **Retention-purge** scheduled job (session 03 single-runner + 08 policy).
- Invariant: **no PII in the audit log** (session 03).

## Verification (hooked into 05/06/08)

- **Anonymize:** after erasure, the consumer's phone/name/address are unrecoverable (key deleted); device tokens & saved places are gone; orders remain with an anonymized customer identity + intact business fields.
- **Audit integrity:** the hash chain still verifies after erasure; no PII is present in any audit row.
- **Cross-module:** erasure touches each module only through its contract; no module reads/writes another's tables.
- **Purge:** an anonymized record past its retention window is hard-deleted by the scheduled job (single-runner — fires once across N instances).
- **In-flight guard:** erasure is refused/deferred while the consumer has an active order.
- **Export:** returns a complete, portable dump prior to erasure.

## Open sub-decisions

- **Retention window** value + ownership — platform-wide statutory default (align to the retailer's PH BIR tax-record obligation, up to ~10y) vs per-retailer configurable (within a legal floor). **Confirm with counsel.**
- **Key management** for crypto-shredding (per-user key storage/rotation; KMS vs app-managed) — with session 08 secrets/encryption. **Keys must live in a separate KMS, not the app DB (GAP-08), so a Postgres PITR restore cannot resurrect a shredded key and un-erase a user.**
- **In-flight policy** — refuse erasure vs defer anonymization of the affected records until terminal.
- **Phase-1 vs Phase-2 timing** — session 08 already flags this against public-launch date; the design here is ready whenever it ships.
