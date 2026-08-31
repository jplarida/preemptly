---
name: database-schema
description: PreEmplty Prisma schema — 14 models on Neon PostgreSQL. Key relations, enums, and design decisions.
type: reference
last_updated: 2026-06-17
---

## Stack
- ORM: Prisma
- DB: Neon PostgreSQL (serverless)
- Status: 100% complete, seeded with test data

---

## Core Models

### User
Consumer/customer account. Auth via phone OTP only.
```
id, name?, phone (unique), region, createdAt, updatedAt
→ locations[], deviceTokens[], retailerLinks[]
```

### Location
Physical address where a tank is used.
```
id, userId, address, type (HOME|BUSINESS), timezone (default Asia/Manila), createdAt, updatedAt
→ tanks[]
```

### Tank
An LPG cylinder belonging to a location.
```
id, locationId, capacityKg, unit (default "kg"), model (EXCHANGE|REFILL),
usageLevel (LIGHT|MODERATE|HEAVY|VERY_HEAVY), lastRefillDate, isActive,
createdAt, updatedAt
→ estimation?, refillLogs[], orders[]
```

### Estimation
Rolling prediction state for a tank.
```
id, tankId (unique), timeBasedEstimate, correctionFactor, calibratedEstimate,
confidence (LOW|MEDIUM|HIGH), currentAdjustment (COOKED_MORE|COOKED_LESS|NORMAL)?,
adjustmentExpiresAt?, createdAt, updatedAt
```

Confidence tiers:
- LOW: 0 refills, cold-start profile defaults
- MEDIUM: 1–2 refills, calibrated
- HIGH: 3+ refills, history-based rolling avg

### RefillLog
Records each time a tank is refilled.
```
id, tankId, refillDate, actualCycleDays?, isOutlier, confirmedByUser, createdAt
```

Outlier: `actualCycleDays < rollingAverage * 0.5` → triggers mobile confirm dialog.

---

## Retailer & Rider

### Retailer
LPG retailer / store.
```
id, businessName, ownerName?, phone?, address?, city, inviteCode (unique),
discountsEnabled, preemptyZoneDays (default 5), basePrices (JSON map of size→price),
createdAt, updatedAt
→ riders[], customerLinks[], orders[], discountTiers[]
```

### DiscountTier
Configurable per-retailer discount tiers.
```
id, retailerId, daysBeforeEmpty, discountAmount, createdAt, updatedAt
```

### Rider
Delivery person linked to a retailer.
```
id, retailerId, name, phone, isActive, createdAt, updatedAt
→ orders[]
```

### RetailerLink
Many-to-many: consumer ↔ retailer with isPrimary flag.
```
id, customerId, retailerId, isPrimary, method (INVITE_LINK|QR_CODE|MANUAL_CODE),
status (ACTIVE|INACTIVE), linkedDate, createdAt, updatedAt
```

---

## Orders

### Order
Delivery order from consumer to retailer via rider.
```
id, tankId, customerId, retailerId, riderId?,
status (PENDING|PENDING_SMS*|CONFIRMED|ASSIGNED|OUT_FOR_DELIVERY|DELIVERED|
        CANCELLED_BY_CUSTOMER|CANCELLED_BY_RETAILER|REJECTED),
note?, capacityKg?, deliveryAddress?,
basePrice, discountAmount, finalAmount,
paymentStatus?, paymentMethod?, confirmationMethod?, confirmationCode?,
needsReview (bool — set when rider uses fallback confirm method),
deliveredAt?, createdAt, updatedAt
```

*PENDING_SMS is a mobile-local-only state, never persisted to DB.

Discount is locked at order creation (`RULE-ORDER-02`).

---

## Auth & Notifications

### OtpCode
Temporary OTP for phone verification.
```
id, phone, code, expiresAt, used, createdAt
```

### DeviceToken
FCM push notification token per device.
```
id, userId, token (unique), platform (ios|android), createdAt, updatedAt
```

---

## Key Design Decisions

1. **Single status column** on Order — all roles see it; labels differ per role.
2. **Retailer-configurable everything** — preemptyZoneDays, discountTiers, basePrices all on Retailer model.
3. **Estimation is a separate model** (1:1 with Tank) — updated on each refill log, not recalculated per-request.
4. **Location → Tank hierarchy** — a user can have multiple locations (home + business), each with multiple tanks.
5. **inviteCode on Retailer** — short unique code (e.g. "GASEXP01") used for manual linking + QR linking.
