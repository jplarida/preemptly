---
name: architecture
description: PreEmplty system architecture — actors, service boundaries, estimation engine, order channels, tech decisions
type: reference
last_updated: 2026-06-17
---

## System Overview

**PreEmplty** is an LPG (cooking gas) smart pre-order system for the Philippines. Core concept: estimate when a household will run out of gas, notify them to reorder early ("preempty"), reward early reordering with a tiered discount.

---

## Actors

| Actor | App | Auth |
|-------|-----|------|
| Consumer / Customer | Flutter mobile app | Phone OTP + JWT |
| Rider | Flutter mobile app (separate build) | Phone OTP + JWT (rider scope) |
| Retailer | Next.js web dashboard | Separate auth (TBD) |

---

## Service Boundaries

```
                    ┌──────────────────┐
                    │  Elysia/Bun API  │
                    │  (port 3000)     │
                    │  Prisma ORM      │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │  Neon PostgreSQL  │
                    │  (serverless)    │
                    └──────────────────┘
                             ▲
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────┴──┐  ┌────────┴───┐  ┌──────┴──────┐
    │  Flutter   │  │  Next.js   │  │  Background │
    │  Mobile    │  │  Web Dash  │  │  Workers?   │
    │  (consumer)│  │  (retailer)│  │  (future)   │
    └────────────┘  └────────────┘  └─────────────┘
```

**External services:**
- **Semaphore** — SMS OTP delivery (Philippines)
- **FCM** — push notifications (planned)
- **Neon** — serverless PostgreSQL hosting

---

## Estimation Engine

The core intellectual property of the system. Hybrid approach:

### Tier 1: Cold Start (0 refills, LOW confidence)
Profile-based defaults for 11kg tank:
- Light: ~45 days
- Regular/Moderate: ~37 days (default)
- Heavy: ~28 days
- Very Heavy: ~20 days

Displayed as ±30% range. Confidence badge: gray "Getting to know your usage."

### Tier 2: Calibrated (1–2 refills, MEDIUM confidence)
Uses correction factor from observed vs predicted cycle. ±20% range.

### Tier 3: History-based (3+ refills, HIGH confidence)
Rolling average of actual cycle durations. Outlier filtering (cycles < 50% of avg excluded unless user confirms). ±10% range.

**Adjustment system:** User can report "cooked more/less than usual" → temporary correction factor applied (expires after N days).

---

## Order Channels

All channels converge to the same Order record in the DB. Retailer web app is the single entry point for non-API orders.

| Channel | Trigger | Who processes |
|---------|---------|---------------|
| In-app (online) | Customer taps "Place Order" | API (automatic) |
| Offline queue | Customer places while offline | App syncs when online |
| SMS fallback | Customer sends pre-filled SMS | Retailer enters manually in web |
| Missed call | Customer dials store number | Retailer calls back / creates order |
| Manual call | Customer calls store | Retailer enters in web |
| Walk-in | Customer visits store | Retailer logs after-the-fact |

---

## Delivery Acknowledgement (3 methods)

1. **QR scan** (preferred) — customer shows order QR from app, rider scans
2. **4-digit code** — customer reads code from app, rider types
3. **Rider-side confirm** (fallback) — rider taps "Mark Delivered", flagged as `needsReview` on order

On delivery confirmed:
- Order status → DELIVERED
- RefillLog created automatically
- Customer estimation resets (new full tank countdown begins)
- Both parties notified

---

## Phase Plan

**Phase 1 (MVP):**
- Consumer mobile + Elysia API + Retailer web
- COD payment only
- Philippines +63 only
- SMS via Semaphore (not yet integrated)
- FCM push (not yet integrated)

**Phase 2:**
- GCash / Maya payment integration
- Viber/Messenger bot for order channel
- Rider app (separate Flutter build)
- Missed call order logging

---

## Key Architecture Decisions

1. **Elysia/Bun over NestJS** — faster, lighter, better TypeScript ergonomics. NestJS legacy kept for reference.
2. **Neon PostgreSQL** — serverless, zero-ops for MVP. Scale to dedicated Postgres if needed.
3. **Offline-first mobile** — SQLite cache + mutation queue. Essential for Philippine mobile connectivity.
4. **Retailer-configurable everything** — zone threshold, discount tiers, base prices all configurable per-retailer, not hardcoded.
5. **Next.js for web (for now)** — SvelteKit migration decision deferred until Phase 1 ships.
