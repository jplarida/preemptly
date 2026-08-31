# Session 10 — Billing & Checkout (tenant feature-availing)

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Depends on:** 01 (pack registry + entitlement gate + Redis), 02 (auth/`currentUser`/RBAC/`service` role/audit), 03 (events/outbox/relay/audit sink). **Tenancy model:** `draft/api-backend-hierarchical-tenancy.md` (the `Subscription`/`Entitlement` entities this session makes real).
> **Phase 2 · optional for launch.** The *enforcement* seams (registry mounts on `deployment config × entitlement`; write path rejects non-entitled verticals; entitlement resolved onto `currentUser`) already exist from 01/02 — this session builds the **self-serve subscribe-and-pay journey** that flips those entitlements. Until then, availing a feature is an operator/config action (manual entitlement toggle).
> Fills the gap flagged in the final plan's Open Items: "the actual purchase/checkout UX on availing is not designed; payment integration is out of scope." This session scopes it.

## Goal

Give a **tenant/retailer** a self-serve, auditable path to *avail a feature (pack/vertical)*: browse a plan catalog → check out via **hosted payment** (GCash / Maya / card) → on a **verified provider webhook**, activate the subscription and flip the tenant's `Entitlement` → the pack's routes mount and its writes are accepted on the next request. Payment card/wallet handling stays with the provider (**PCI scope ~zero**); the API remains the system of record for subscriptions, invoices, and entitlements.

Turns the Phase-1 reality (*onboard → get `pack-lpg` by default → an operator toggles any future pack*) into a tenant-driven flow, without moving any truth out of the API.

## Boundary (must hold)

- **API owns truth; the payment provider only runs the card/wallet interaction.** Same rule as n8n (07): the provider *reacts*, it never owns truth.
- **The browser redirect back is cosmetic.** The **truth-flip is the webhook** — redirects are unreliable and spoofable, so entitlement never activates on the redirect alone.
- **No cross-module DB access.** `billing` reacts to events and calls other modules' `contract.ts`; it never writes their tables. It lives in **`core-domain`** (vertical-agnostic, like `pricing`/`notifications`) so one billing surface serves every pack.

## Data model (additive to the Phase-2 `Subscription`/`Entitlement`)

```
Plan          catalog: { key, verticals[], priceMinor, currency='PHP', interval, tier }
Subscription  tenantId, planId, status(pending|active|past_due|canceled),
              currentPeriodEnd, provider, providerSubId?, billedByTenantId?
Entitlement   tenantId, verticals[]   ← projected from active Subscription(s); the registry/write-path read this
Invoice       subscriptionId, periodStart/End, amountMinor, status(open|paid|void|failed)
Payment       invoiceId, provider, providerRef, amountMinor, status, method(gcash|maya|card)
WebhookEvent  providerEventId UNIQUE, type, payloadHash, processedAt   ← idempotency ledger
```

`billedByTenantId` separates *who pays the platform* (a reseller) from *who consumes the seats* (its branch) — the pointer named in the hierarchical-tenancy draft.

## Checkout sequence (happy path)

```
Retailer (web)        api-core (billing)              PayMongo / Xendit
    │  1 GET /v1/billing/plans ─────────►│
    │◄──────────── catalog ──────────────┤
    │  2 POST /v1/billing/checkout {planKey}
    │     (Idempotency-Key) ────────────►│ 3 Subscription(pending) + Invoice(open) in one tx
    │                                     │ 4 provider.createCheckout() ──►│
    │                                     │◄──── checkoutUrl + ref ────────┤
    │◄──────── { checkoutUrl } ───────────┤
    │  5 redirect to hosted page ───────────────────────────────────────►│  (pays; PCI on provider)
    │◄─────────── redirect to /billing/return (display only) ─────────────┤
    │                                     │◄══ 6 WEBHOOK payment.paid ═════┤
    │                                     │ 7 verify HMAC + dedup on providerEventId
    │                                     │ 8 TX: Invoice→paid, Payment→ok,
    │                                     │   Subscription→active,
    │                                     │   Entitlement.verticals += pack,
    │                                     │   + outbox: SubscriptionActivated
    │                                     │ 9 relay → invalidate entitlement cache, notify, audit
```

**Entitlement propagation (how the feature turns on):** activation writes `Subscription` + `Entitlement` + outbox event in **one transaction** ("state changed ⟺ event emitted"); the relay fires `SubscriptionActivated` → handler **invalidates the tenant's Redis entitlement cache**; auth resolves entitlements from that cache onto `currentUser` and the write path re-checks against it → the vertical is usable on the **next request**, no redeploy, no waiting for token expiry. The registry already gates `/v1/<key>` mounting on `deployment config × entitlement`.

## Tasks

### Billing module (`core-domain/billing`)
- [ ] `billing.model.ts` — TypeBox schemas (`additionalProperties:false`) for plans, checkout request, subscription/invoice views.
- [ ] `billing.repository.ts` — the only place `Plan`/`Subscription`/`Invoice`/`Payment`/`Entitlement`/`WebhookEvent` tables are touched; tenant-scoped under RLS.
- [ ] `billing.service.ts` — catalog read, `createCheckout`, webhook processing, activation, renewal, dunning, cancel/downgrade. Depends on repository + `paymentProvider` + bus ports, never Prisma.
- [ ] `billing.contract.ts` — `getEntitlement(tenantId)` and subscription lookups other modules/registry may call.
- [ ] `billing.events.ts` — `SubscriptionActivated`, `SubscriptionRenewed`, `PaymentFailed`, `EntitlementRevoked`, `SubscriptionCanceled` (in `packages/shared-types`).
- [ ] `billing.routes.ts` — `GET /v1/billing/plans`, `POST /v1/billing/checkout` (RBAC: retailer; **Idempotency-Key** required), `GET /v1/billing/subscription`, `GET /v1/billing/return` (display-only).

### Payment provider port
- [ ] `platform/payments/provider.ts` — `paymentProvider` interface (`createCheckout`, `verifyWebhook`, `fetchPayment`) mirroring the `otpSender`/`pushSender` abstraction. First impl: **PayMongo or Xendit** (GCash + Maya + card, hosted checkout, webhooks in PH). Provider + signing secrets via validated env — boot fails if missing.

### Webhook ingestion (the truth-flip)
- [ ] `POST /internal/billing/webhook` on the **`service`-role `/internal/*`** path (same pattern as n8n, 07); **off the critical path**.
- [ ] **HMAC-verify** the provider signature before doing anything — **+ reject on timestamp skew** (replay protection); the `WebhookEvent.providerEventId` dedup covers retries. This is the GAP-09 external-caller pattern (HMAC + skew + dedup).
- [ ] **Idempotent** via `WebhookEvent.providerEventId UNIQUE` — providers retry at-least-once; the ledger makes processing exactly-once.
- [ ] On `payment.paid`: the activation transaction (step 8) + outbox event. On `payment.failed`: `Subscription.past_due` + dunning.

### Lifecycle jobs (BullMQ repeatable, from the 03 seam)
- [ ] **Renewal** — recurring charge → `invoice.paid` extends `currentPeriodEnd`; a repeatable job reconciles upcoming renewals (the plan's "cron → repeatable job").
- [ ] **Dunning** — retry schedule + notifications on `past_due`; **grace window** before entitlement revoke.
- [ ] **Cancel / lapse / downgrade** — remove vertical from `Entitlement` → emit `EntitlementRevoked` → cache invalidated → registry stops mounting + write path rejects. **Data retained (read-only), not deleted** — matches the RA 10173 retention posture.
- [ ] **Reconciliation** — scheduled diff of local `Subscription`/`Invoice` vs the provider API; self-heals webhooks that never arrived (the webhook backstop).

### Security / audit (reuse mandated controls)
- [ ] Every subscription/entitlement change → the **append-only, hash-chained audit log** (02/03; already mandated for "retailer-settings changes").
- [ ] Billing rows tenant-scoped under **RLS**; a tenant sees/acts on only its own subscription.

### Manual/comp path (coexist with Phase-1 config toggle)
- [ ] Admin-granted entitlement with **no `Subscription`** (free trial / comp) — so the operator toggle and the paid flow write the same `Entitlement`, read the same way by the registry.

### Reseller re-billing (Phase-2 tie-in; seam only)
- [ ] Honor `Subscription.billedByTenantId` — a child's checkout charges the reseller; provisioning a child's entitlement checks the **parent's** entitlement (`canResell`) and is audited (hierarchical-tenancy draft).

## Files (new/modified)

New: `apps/api-core/src/modules/billing/*` (routes, service, repository, model, contract, events, unit + integration tests); `apps/api-core/src/platform/payments/provider.ts` (+ provider impl); `/internal/billing/webhook` handler; billing jobs.
Modified: `prisma/schema.prisma` (`Plan`, `Subscription`, `Invoice`, `Payment`, `Entitlement`, `WebhookEvent`; RLS policies); `packages/shared-types` (billing events + entitlement contract); pack registry entitlement read (already stubbed in 01).

## Reuse

- Entitlement gate + registry mounting: session 01. `currentUser`/RBAC/`service` role + audit: session 02. Outbox/relay + `Idempotency-Key`: sessions 02/03.
- `paymentProvider` follows the existing `otpSender`/`pushSender` port pattern.
- Repeatable-job seam and "cron → BullMQ repeatable job": session 03 / final-plan reliability section.

## Acceptance / verification

- **Happy path:** `POST /checkout` → hosted page → `payment.paid` webhook activates the subscription; the tenant's `Entitlement` gains the vertical and its `/v1/<key>` routes serve on the next request.
- **Truth-flip discipline:** completing the browser redirect *without* the webhook does **not** activate; only the verified webhook does.
- **Idempotent checkout:** duplicate `POST /checkout` with the same `Idempotency-Key` → one Subscription.
- **Idempotent webhook:** re-delivering the same `providerEventId` processes once (no double activation, no double charge record).
- **HMAC:** a webhook with a bad/absent signature is rejected (401/403) and audited.
- **Revoke:** cancel/lapse removes the vertical → registry stops mounting + write path returns 403 for that vertical; historical rows remain readable.
- **Reconciliation:** drop a webhook in test → the reconcile job converges local state to the provider.
- **Tenancy:** a tenant cannot read/act on another tenant's subscription (RLS); reseller re-billing charges `billedByTenantId`.
- Unit + integration green; `tsc -b` clean; CI security gates (06) pass.

## Notes

- Adds cleanly as **one core-domain module + one provider port + one `/internal` webhook route + the recurring/reconcile jobs** — no changes to the kernel, the `DomainPack` registry contract, or the pack anatomy.
- Keep webhook processing internal, HMAC-verified, and off the critical path — a down provider or n8n must never block a tenant's operational flows.

## Open decisions

1. **Provider:** PayMongo vs Xendit (both: GCash + Maya + card, hosted checkout, webhooks in PH) vs direct GCash/Maya merchant APIs.
2. **Subscription engine:** provider-managed recurring (simpler; provider owns the schedule) vs API-managed invoices/dunning (more control, more build). 
3. **Grace / dunning policy:** retry cadence and how long `past_due` keeps the feature live before revoke.
4. **Proration** on mid-cycle upgrade/downgrade — support or forbid.
5. **Free trial / comp** entitlement (no `Subscription`) — confirm it's the same path the Phase-1 operator toggle uses.
6. **Catalog home:** DB `Plan` table vs price metadata declared on the `DomainPack` contract.
7. **Launch timing:** ship only when a second paid vertical or paid LPG tier exists — until then the operator toggle suffices.
