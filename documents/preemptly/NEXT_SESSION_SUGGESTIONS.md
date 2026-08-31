# Next Session Suggestions — Remaining Work for LPG App MVP

## Project Audit Date: 2026-02-17

## Current Status Overview

| Area | Completeness | Notes |
|------|-------------|--------|
| Database Schema (Prisma) | 95% | All 12 models, 8 enums, seed data complete |
| API Backend (NestJS) | 85% | All 11 modules implemented |
| Estimation Engine | 100% | Core logic + 16 unit tests |
| Flutter Mobile App | 75% | All core screens built |
| Next.js Web Dashboard | 85% | All 8 pages functional |
| Shared Types Package | 90% | 9 enums, 22 interfaces |
| DevOps/CI | 0% | Nothing set up |
| Testing | 15% | Only estimation engine tested |

---

## Priority 1: Critical Gaps (Must Fix Before Any Testing)

### 1.1 Run Prisma Migrations
- `prisma/migrations/` directory does not exist
- Need to run `npx prisma migrate dev --name init` against Neon database
- Then run `npx prisma db seed` to populate test data

### 1.2 Flutter Auth Guard Missing
- GoRouter does not check authentication state
- A user can navigate directly to `/home` without being logged in
- Add redirect logic in `apps/mobile/lib/router/app_router.dart`

### 1.3 Firebase Initialization in Flutter
- `main.dart` does not call `Firebase.initializeApp()`
- firebase_core and firebase_messaging are dependencies but never initialized
- Push notifications will not work until this is set up

---

## Priority 2: Integration Gaps

### 2.1 Firebase Push Notifications (Backend)
- `NotificationsService` in `apps/api/src/notifications/` only logs to console
- Need to integrate Firebase Admin SDK for actual push delivery
- Affects: low gas alerts, new order notifications, order status updates

### 2.2 Offline Queue Not Wired (Flutter)
- `OfflineQueue` class exists at `apps/mobile/lib/core/network/offline_queue.dart`
- SQLite queue + cache tables are structured
- **Not connected** to `ApiClient` — no automatic queueing on network failure or replay on reconnect
- `connectivity_plus` dependency listed but not used anywhere

### 2.3 Production OTP Sender
- Only `ConsoleOtpSender` exists (logs OTP to console)
- Need to build `SemaphoreOtpSender` for Philippine SMS gateway
- Interface already exists — just need the implementation
- Semaphore API: `POST https://api.semaphore.co/api/v4/otp`

### 2.4 Shared Types Not Consumed
- `packages/shared-types/` has 22 interfaces and 9 enums
- Neither the API nor the web dashboard imports from `@preemptly/shared-types`
- API uses locally defined DTOs, web defines interfaces inline in page components
- Consider importing shared types for consistency

---

## Priority 3: Mobile App Gaps

### 3.1 Settings Sub-Screens Are Stubs
- Tank Settings and Notifications screens have empty `onTap: () {}` handlers
- Need to build actual settings screens

### 3.2 No Multi-Tank Support in UI
- `DashboardNotifier` always picks `tanks.first`
- Schema supports multiple tanks but UI does not
- Phase 1 is single-tank only, but UI should handle the case gracefully

### 3.3 No Typed Models (Freezed/JSON Serializable)
- `freezed` and `json_serializable` are dev dependencies
- No generated files or model classes using `@freezed` annotations exist
- All data is passed as `Map<String, dynamic>` — fragile and error-prone

---

## Priority 4: Web Dashboard Gaps

### 4.1 No Server-Side Auth
- Auth is purely client-side via localStorage token check
- No Next.js middleware, no httpOnly cookies, no SSR protection
- Acceptable for MVP but should be noted

### 4.2 No Shared Component Library
- Everything is inline JSX with raw Tailwind classes
- No reusable components (buttons, cards, badges, tables)
- Consider setting up shadcn/ui as planned

### 4.3 Loading/Error States
- Some pages (e.g., invite page) don't show loading skeletons
- Should add consistent loading and error states across all pages

---

## Priority 5: Security & Production Readiness

### 5.1 Rate Limiting on OTP Endpoints
- No rate limiting exists — vulnerability to brute force
- Should add: max 5 OTP requests per phone per hour

### 5.2 CORS / Helmet / Input Sanitization
- CORS is enabled but verify configuration
- Add Helmet middleware for HTTP security headers
- Ensure all inputs are sanitized

### 5.3 API Documentation
- Swagger/OpenAPI not set up
- Should add `@nestjs/swagger` for auto-generated API docs at `/api/docs`

---

## Priority 6: DevOps & Deployment

### 6.1 Dockerfiles
- No Dockerfile for NestJS API
- Need multi-stage build: install deps → build → copy dist → run

### 6.2 CI/CD Pipeline
- No GitHub Actions, no deployment scripts
- Plan: API → Railway/Render/Fly.io, Web → Vercel, Mobile → Play Store/TestFlight

### 6.3 Neon Database Configuration
- Set up production and development branches
- Configure connection pooling (`pgbouncer=true`)
- Set `DIRECT_URL` for migrations

---

## Priority 7: Testing

### 7.1 API Tests Needed
- Only `estimation.engine.spec.ts` has tests (16 cases)
- Need: auth flow tests, refill logging tests, order lifecycle tests, retailer endpoint tests

### 7.2 Flutter Tests Needed
- No widget tests or integration tests exist
- Priority: dashboard widget tests, auth flow integration test, offline queue test

### 7.3 End-to-End Testing
- No E2E tests for the full consumer or retailer journey
- Should test: setup → track → refill → order (consumer) and register → invite → manage orders (retailer)

---

## Suggested Session Order

1. **Session 1:** Run migrations, fix Flutter auth guard, initialize Firebase — get everything bootable
2. **Session 2:** Wire up offline queue, integrate Firebase push notifications
3. **Session 3:** Build production OTP sender, add rate limiting, security hardening
4. **Session 4:** Complete Flutter settings screens, add typed models, polish UI states
5. **Session 5:** Web dashboard improvements — shared components, loading states
6. **Session 6:** Testing — API integration tests, Flutter widget tests
7. **Session 7:** DevOps — Dockerfiles, deployment config, CI/CD
8. **Session 8:** End-to-end testing and launch prep
