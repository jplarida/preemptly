# Preemptly — Development Status

> Last updated: 2026-03-23

## Overall: ~65% complete

| Component | Status | Completion |
|-----------|--------|------------|
| **Database & Schema** | ✅ Done | 100% |
| **Backend API (Elysia/Bun)** | ✅ Done | 100% |
| **Backend API (NestJS)** | ✅ Done (legacy) | 100% |
| **Retailer Web Dashboard** | 🔧 Functional, framework TBD | 90% |
| **Consumer Mobile App** | 🔧 Scaffolded, needs completion | 50% |
| **Integration & Deployment** | ⏳ Not started | 0% |
| **Polish & Launch Prep** | ⏳ Not started | 0% |

---

## What's Done

### Backend (Elysia/Bun) — 100%
Fully functional with all endpoints: auth (consumer + retailer + rider), tanks, predictions, refills, orders (full lifecycle), retailers, riders, linking, discounts, notifications, health check. Estimation engine with hybrid prediction system working.

### Database — 100%
14 models in Prisma, seeded with test data, running on Neon PostgreSQL.

### Web Dashboard — 90%
All pages built in Next.js: login, registration, dashboard stats, customer list, order management, invite system, settings (pricing/discounts/preemptly zone). Framework migration to SvelteKit undecided.

---

## Mobile App — What's Built vs What's Missing

| Feature | Built | Missing |
|---------|-------|---------|
| Auth (phone + OTP) | ✅ Screens + repository | — |
| Tank setup onboarding | ✅ 3-step wizard | — |
| Dashboard / home | ✅ Circular gauge + prediction | Adjustment card, offline banner |
| Orders | ✅ Create + history screens | Order detail with timeline |
| Retailer linking | ✅ Manual code entry | QR scanner, deep link handling |
| Settings | ✅ Basic screen | Full profile, tank management |
| Refill logging | ❌ | Entire feature (screen, outlier confirm, repository) |
| Dart models (freezed) | ❌ | All models need proper definition |
| Bottom navigation | ❌ | ShellRoute with 3 tabs |
| Offline/caching | ✅ Queue exists | Cache-then-network, connectivity service, offline banner |
| Push notifications | ❌ | FCM setup + token registration |
| Shared widgets | ❌ | Loading, error, empty states |

---

## What's Blocking Launch

1. **Mobile app completion** — Refill feature, models, bottom nav, offline polish, push notifications
2. **Web framework decision** — Stay Next.js or migrate to SvelteKit
3. **Integration** — Firebase setup, deep linking, SMS provider (Semaphore), deployment
4. **Polish** — Loading/error states, rate limiting, error tracking (Sentry)

Mobile is the biggest remaining effort.

---

## Related Documents

- `MOBILE_APP_PLAN.md` — High-level mobile app plan
- `MOBILE_APP_DEEP_DIVE.md` — Detailed wireframes, models, navigation, offline strategy
- `PHASE1_MVP_IMPLEMENTATION_PLAN_v2.md` — Updated implementation phases
- `LPG_App_Product_Strategy_Document.md` — Product strategy and roadmap
