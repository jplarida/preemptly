---
name: web-dashboard
description: Next.js retailer web dashboard — pages built, patterns, framework decision status
type: reference
last_updated: 2026-06-17
---

## Stack

- **Framework**: Next.js (~90% complete)
- **Status**: All main pages built, needs polish and integration
- **Framework migration**: SvelteKit migration is **undecided** — do not introduce SvelteKit patterns until a decision is made

---

## Pages Built

| Page | Status |
|------|--------|
| Login | ✅ |
| Registration | ✅ |
| Dashboard stats overview | ✅ |
| Customer list (with preempty state filters) | ✅ |
| Order management (PENDING/CONFIRMED/etc tabs) | ✅ |
| Invite system (generate QR / invite code) | ✅ |
| Settings — pricing & base prices | ✅ |
| Settings — discount tiers | ✅ |
| Settings — preempty zone threshold | ✅ |
| Rider management | 🔧 partial |
| SMS order entry (manual) | 🔧 partial |

---

## Retailer Dashboard Features

**Overview stats:**
- Total customers linked
- Active orders count
- Customers running low count
- Deliveries this month

**Customer list:**
- Filter by preempty state: Running Low / OK / New
- Sort by days remaining, last delivery, area
- Click → order history + estimation details

**Order management:**
- Tabs: Pending / Confirmed / Out for Delivery / Delivered / Rejected
- Actions: Confirm, Reject (with reason), Assign rider, Adjust discount
- Manual SMS order entry form → creates API record

**Invite & linking:**
- Store QR code + invite link for customer onboarding
- Invite conversion stats

**Settings:**
- Base price per LPG size (e.g. 11kg = ₱850)
- Discount tiers (daysBeforeEmpty → discountAmount, all editable)
- Preempty zone threshold (1–10 days, default 5)
- Enable/disable discounts

---

## Retailer Order Status Labels

The web dashboard shows retailer-specific labels for the same DB statuses:
| DB Status | Retailer Label |
|-----------|---------------|
| PENDING | New |
| CONFIRMED | Accepted |
| ASSIGNED | Assigned |
| OUT_FOR_DELIVERY | In Transit |
| DELIVERED | Delivered |
| REJECTED | Rejected |
| CANCELLED_BY_CUSTOMER | Cancelled |
| CANCELLED_BY_RETAILER | Cancelled |

---

## Key Open Decisions

1. **SvelteKit migration** — not yet decided. Current Next.js code is fully functional. Decision needed before Phase 2 work starts.
2. **Auth for retailer web** — likely separate JWT scope from consumer. Retailer login is email+password (TBC) rather than phone OTP.
