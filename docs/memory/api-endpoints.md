---
name: api-endpoints
description: Full PreEmplty API endpoint reference — auth, tanks, refills, orders, linking, notifications, discounts
type: reference
last_updated: 2026-06-17
---

## Base URL
- Dev (Android emulator): `http://10.0.2.2:3000/api`
- Dev (iOS simulator): `http://localhost:3000/api`
- Backend: Elysia/Bun

## Auth (`/auth`)

```
POST /auth/send-otp
  Body:     { phone: string }           // +63XXXXXXXXXX format
  Response: { message: string }

POST /auth/verify-otp
  Body:     { phone: string, code: string }   // code = 6 digits
  Response: { accessToken: string, isNewUser: boolean, user: User }
```

**isNewUser: true** → navigate to `/onboarding`
**isNewUser: false** → navigate to `/home`

---

## Users (`/users`)

```
GET  /users/me
  Response: User

PATCH /users/me
  Body:     { name?: string, region?: string }
  Response: User
```

---

## Tanks (`/tanks`)

```
POST /tanks
  Body:     { locationId, capacityKg, model, usageLevel, unit? }
  Response: Tank

GET  /tanks
  Response: Tank[]   // includes location + estimation

GET  /tanks/:id
  Response: Tank     // includes location + estimation + refillLogs (last 10)

PATCH /tanks/:id
  Body:     { capacityKg?, model?, usageLevel? }
  Response: Tank

DELETE /tanks/:id
  Response: Tank
```

### Prediction & Adjustment

```
GET  /tanks/:id/prediction
  Response: {
    tankId, daysElapsed, estimatedTotalDays, estimatedRemainingDays,
    displayRange: { low, high },
    confidence: "LOW" | "MEDIUM" | "HIGH",
    refillCount,
    currentAdjustment
  }

POST /tanks/:id/adjust
  Body:     { adjustment: "COOKED_MORE" | "COOKED_LESS" | "NORMAL" }
  Response: Prediction
```

---

## Refills (`/refills`)

```
POST /refills
  Body:     { tankId, refillDate?: ISO8601, confirmOutlier?: boolean }
  Response: RefillLog

  // confirmOutlier: pass true when user confirms an outlier cycle

GET  /refills/tank/:tankId
  Response: RefillLog[]

PATCH /refills/:id/confirm
  Response: RefillLog
```

**Outlier detection**: if actualCycleDays < average * 0.5, the response includes `isOutlier: true`. Mobile shows the outlier confirm screen before proceeding.

---

## Orders (`/orders`)

```
POST /orders
  Body:     { tankId, retailerId, note?, capacityKg?, deliveryAddress? }
  Response: Order   // with tank, customer, retailer

GET  /orders
  Response: Order[]   // with tank, retailer, statusLabel

GET  /orders/:id
  Response: Order     // with tank, customer, retailer

PATCH /orders/:id/cancel
  Response: Order
```

**Status flow (DB):**
PENDING → CONFIRMED → ASSIGNED → OUT_FOR_DELIVERY → DELIVERED
       ↘ CANCELLED_BY_CUSTOMER
       ↘ CANCELLED_BY_RETAILER
       ↘ REJECTED

---

## Retailer Linking (`/link`)

```
GET  /link/retailer/:code
  Response: { id, businessName, city }   // preview before linking

POST /link/retailer
  Body:     { code, method: "INVITE_LINK" | "QR_CODE" | "MANUAL_CODE" }
  Response: RetailerLink

GET  /link/retailers
  Response: RetailerLink[]
  // Each: { linkId, isPrimary, retailer: { id, businessName, city, phone, address }, linkedDate }

DELETE /link/retailer/:retailerId
  Response: RetailerLink   // status: INACTIVE

PATCH  /link/retailer/:retailerId/primary
  Response: RetailerLink   // isPrimary: true
```

---

## Notifications (`/notifications`)

```
POST   /notifications/device-token
  Body:     { token: string, platform: "ios" | "android" }
  Response: DeviceToken

DELETE /notifications/device-token/:token
  Response: { count: number }
```

---

## Discounts (`/discounts`)

```
GET /discounts/tiers
  Response: {
    tiers: [{ daysBeforeEmpty: number, discountAmount: number }],
    preemptyZoneDays: number,
    discountsEnabled: boolean
  }
```

Default tiers: 5d=₱50, 4d=₱40, 3d=₱30, 2d=₱20, 1d=₱10, 0d=₱0. All configurable by retailer.

---

## Health

```
GET /health
  Response: { status: "ok", timestamp }
```
