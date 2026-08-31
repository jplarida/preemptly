# PreEmptly — Revised Process Flow (v2)

**Based on:** `preemptly.md` (original flow)
**Date:** 2026-03-01
**Changes:** Addresses 16 identified flaws in the original process flow

---

## Findings from Original Flow Review

### Business Logic Flaws

1. **Discount structure is flat and exploitable** — Days 1–5 all give 50 pesos discount. No incentive to order at 5 days vs 1 day. Defeats the purpose of encouraging early reordering.
   - **Owner feedback:** Default tiers provided but **fully customizable by retailer**. Retailers set their own discount tiers, preemptly zone days, and amounts via web dashboard settings.

2. **"Days early" has no defined baseline** — Discount is relative to estimated empty date, but estimations are unreliable on first use (no refill history). Customers could gain/lose discounts due to inaccurate estimates.
   - **Owner feedback:** Baseline (preemptly zone) is also **retailer-customizable**. Each retailer defines their own preemptly zone threshold (default 7 days, adjustable).

3. **No order cancellation flow** — Customer taps "preemptly", button becomes QR with no way to cancel. No timeout if rider never comes.

4. **No retailer order acceptance step** — Customer orders, rider sees it, but retailer never confirms they can fulfill. No handling for out-of-stock or price changes.

### QR Code Flaws

5. **QR contains too much static data** — Embedding customer details, retailer details, consumption, discount structure, and unique ID makes the QR dense, hard to scan, and stale when data changes.
   - **Owner feedback:** Reference ID alone breaks offline scanning. **Hybrid QR approach:** QR contains reference ID + minimal offline-essential fields (retailer name, store phone, LPG size). Enough to function offline; full data fetched by ID when online.

6. **QR-only acknowledgement is fragile** — Requires physical scan in both directions. No fallback for broken cameras, poor lighting, cracked screens, or left-at-door deliveries.
   - **Owner feedback:** SMS fallback was originally intended for this. Additional fallback channels identified:
     - **Missed call ordering** — customer gives missed call to store number, system logs as order intent (common PH pattern)
     - **Viber/Messenger bot** — high penetration in PH, alternate order/acknowledgement channel
     - **Manual call** — customer calls store, retailer enters order manually in web app
     - **Walk-in** — customer goes to store, retailer logs order after the fact
     - **Offline queue sync** — order queues locally, syncs when back online
     - **Confirmation code** — 4-digit code as non-QR acknowledgement (already in revised flow)

7. **First delivery assumes customer already has the app** — Rider generates QR immediately, but customer needs to download/install/open first. Slow data connections in rural PH could mean minutes of waiting.

### SMS Fallback Flaws

8. **SMS order has no acknowledgement path** — Customer sends SMS but has no way to know if it was received, read, or acted upon.
   - **Owner feedback:** SMS acknowledgement to be added as part of offline order flow. When retailer enters the SMS order into the web app, system sends confirmation SMS back to customer.

9. **SMS parsing on rider side is unreliable** — Programmatic SMS access is restricted on modern Android and essentially blocked on iOS.

10. **SMS goes to store, not rider** — Store receives the SMS but the handoff to the correct rider is undefined.

### Role & Flow Gaps

11. **Rider has too many phone interactions during delivery** — Data entry, QR generation, scanning, acknowledgement — all while handling heavy tanks.

12. **No multi-retailer scenario** — Assumes one retailer link forever. No unlinking or switching.

13. **Rider management is vague** — "Update/report records" and "notify rider" are undefined in method and content.

### Missing Considerations

14. **No pricing/payment flow** — Discount references a price but no base price, payment method, or transaction handling exists.

15. **No ability to change LPG size on reorder** — Customer locked to initial size selection.

16. **No customer verification on delivery** — Rider has no way to confirm they're delivering to the right person.

---

## Revised Process Flow

### 1. First Delivery — Customer Onboarding

**Actor:** Rider (on-site with customer)

```
Rider arrives for first LPG delivery
│
├─ Rider opens PreEmptly app → "New Customer" flow
│   ├─ Inputs:
│   │   - Customer name
│   │   - Customer address
│   │   - Customer contact number
│   │   - LPG size delivered (default: 11 kg)
│   │   - Estimated consumption level:
│   │       - Light
│   │       - Regular (default)
│   │       - Heavy
│   │       - Very Heavy
│   │   - Date of delivery (auto: today)
│   │
│   ├─ App generates a HYBRID QR code containing:
│   │   - Generated Unique Link ID (retailer + customer hash)
│   │   - Retailer ID
│   │   - Retailer name (for offline display)
│   │   - Store contact phone (for offline SMS fallback)
│   │   - LPG size delivered
│   │   (Minimal offline-essential data; full details fetched by ID when online)
│   │
│   └─ Rider shows QR to customer
│
├─ Customer scans QR:
│   ├─ IF app installed → scan QR → auto-links to retailer, pre-fills profile
│   │   └─ Customer confirms/edits their details → setup complete
│   │
│   └─ IF app NOT installed:
│       ├─ Rider gives customer a CARD/STICKER with:
│       │   - QR code (same one, printed or screenshot)
│       │   - Short link URL as fallback
│       │   - Manual link code (6 chars, e.g., "ABC123")
│       └─ Customer can set up later at their own pace
│           └─ Open app → scan QR / enter manual code → links to retailer
│
└─ Rider taps "Delivery Complete" → record saved, syncs to web app
```

**Fixes addressed:** #5 (lean QR), #7 (setup-later path), #11 (minimal rider interaction)

---

### 2. Estimation & Notification

**Actor:** System (runs automatically)

```
App calculates estimated days remaining (works offline)
│
├─ Estimation sources (in priority order):
│   1. History-based (3+ refills → HIGH confidence, ±10%)
│   2. Calibrated (1-2 refills → MEDIUM confidence, ±20%)
│   3. Profile-based cold start (0 refills → LOW confidence, ±30%)
│       - Light:      ~45 days for 11kg
│       - Regular:    ~37 days for 11kg
│       - Heavy:      ~28 days for 11kg
│       - Very Heavy: ~20 days for 11kg
│
├─ "Preemptly Zone" defined as: estimated ≤ N days remaining
│   (N = retailer-configured threshold, range: 1–10 days, default: 5 days)
│   (This is the baseline for discount calculation)
│
├─ Daily check (scheduler):
│   ├─ Customer app: local notification when entering preemptly zone
│   ├─ Customer app: shows estimated days left + applicable discount
│   └─ Rider app: customer appears on "Upcoming Prospects" list
│
└─ Retailer web app: customer shows as "Running Low" with days remaining
```

**Fixes addressed:** #2 (defined baseline: 7-day preemptly zone)

---

### 3. Discount Structure (Revised)

**Tiered incentive — rewards earlier ordering. Fully customizable by retailer.**

Default tiers (retailer can adjust all values):

```
Days before estimated empty    Discount (default)
──────────────────────────────────────────────────
  5 days (entering zone)       50 pesos
  4 days                       40 pesos
  3 days                       30 pesos
  2 days                       20 pesos
  1 day                        10 pesos
  0 days (empty)                0 pesos
```

**Retailer Discount Settings (Web App):**
- Preemptly zone threshold (range: 1–10 days, default: 5 days)
- Discount tiers auto-scale to match the configured zone threshold
- Discount per tier (amount per day, fully editable)
- Base LPG price per size (e.g., 11kg = 850 pesos)
- Enable/disable discounts entirely
- Max discount cap (optional)

**Rules:**
- Discount is calculated at the moment the customer taps "Preemptly Order"
- Discount is locked in at order creation (doesn't change if delivery is delayed)
- Retailer can override discount amount on individual orders from web app
- Discount applies as a deduction from the retailer's set base price

**Fixes addressed:** #1 (tiered, not flat), #2 (clear baseline, retailer-customizable), #14 (base price defined)

---

### 4. Reorder Flow — Customer

**Actor:** Customer (mobile app)

```
Customer sees "Preemptly" notification / banner
│
├─ Displays:
│   - Estimated days remaining
│   - Current discount amount
│   - LPG size (with option to change for this order)
│   - Linked retailer name
│
├─ Customer taps "Preemptly Order" button
│   ├─ Confirm order dialog:
│   │   - LPG size (editable, default: usual size)
│   │   - Delivery address (editable, default: saved address)
│   │   - Optional note to rider
│   │   - Discount shown (locked at this moment)
│   │   - [Confirm Order] / [Cancel]
│   │
│   ├─ ON CONFIRM:
│   │   ├─ IF online:
│   │   │   ├─ POST order to API
│   │   │   ├─ Order status: PENDING
│   │   │   ├─ Push notification sent to retailer + assigned rider
│   │   │   └─ Customer sees order status screen (PENDING → CONFIRMED → OUT_FOR_DELIVERY → DELIVERED)
│   │   │
│   │   └─ IF offline:
│   │       ├─ Order saved to local queue
│   │       ├─ App opens SMS composer (pre-filled, customer taps send):
│   │       │
│   │       │   To: [store contact phone]
│   │       │   ───────────────────────────
│   │       │   PREEMPTLY ORDER
│   │       │   ID: [unique order ID]
│   │       │   Name: [customer name]
│   │       │   Address: [delivery address]
│   │       │   Phone: [customer phone]
│   │       │   LPG Size: [size] kg
│   │       │   Discount: [amount] pesos
│   │       │   ───────────────────────────
│   │       │
│   │       ├─ Order status: PENDING_SMS (special state)
│   │       └─ When back online: queued order syncs to API
│   │           └─ If SMS was sent and API order created → deduplicate by order ID
│   │
│   └─ CANCEL: Customer can cancel anytime before status = OUT_FOR_DELIVERY
│       └─ Taps "Cancel Order" → order status: CANCELLED
│
└─ Order status visible on home screen until delivered or cancelled
```

**Fixes addressed:** #3 (cancel flow), #8 (SMS is user-sent, not silent), #15 (editable LPG size)

---

### 5. Retailer Order Management

**Actor:** Retailer (web app)

```
New order arrives (via API or manual SMS entry)
│
├─ Retailer sees order in dashboard with status: PENDING
│
├─ Retailer actions:
│   ├─ [Confirm] → status: CONFIRMED, assign rider
│   │   └─ Push notification to customer: "Order confirmed, rider assigned"
│   │
│   ├─ [Reject] → status: REJECTED (with reason: out of stock, area not served, etc.)
│   │   └─ Push notification to customer: "Order could not be fulfilled: [reason]"
│   │
│   ├─ [Adjust Discount] → override discount amount (can increase for loyalty, decrease for cost)
│   │
│   └─ For SMS orders (no API record):
│       └─ [Enter SMS Order] → manual entry form, creates API record, proceeds normally
│
└─ Order lifecycle (segregated by role):

    CUSTOMER/CLIENT VIEW:
    ┌──────────────────────────────────────────────────────┐
    │ PLACED → CONFIRMED → OUT FOR DELIVERY → DELIVERED    │
    │   │                                                  │
    │   ├→ CANCELLED (by customer, before OUT FOR DELIVERY)│
    │   └→ REJECTED (by retailer — shown as "Declined")    │
    │                                                      │
    │ Statuses visible: Placed, Confirmed, On the Way,     │
    │                   Delivered, Cancelled, Declined      │
    └──────────────────────────────────────────────────────┘

    RETAILER/SUPPLIER VIEW:
    ┌──────────────────────────────────────────────────────────┐
    │ RECEIVED → ACCEPTED → RIDER ASSIGNED → OUT FOR DELIVERY │
    │   │          │              │              │              │
    │   │          │              │              └→ DELIVERED   │
    │   │          │              │                             │
    │   ├→ REJECTED (with reason: out of stock, area, etc.)    │
    │   └→ CANCELLED (by customer)                             │
    │                                                          │
    │ Statuses visible: New, Accepted, Assigned, In Transit,   │
    │                   Delivered, Rejected, Cancelled          │
    │                                                          │
    │ Additional data: rider assigned, discount applied/overridden,│
    │                  payment status (COD), delivery timestamp │
    └──────────────────────────────────────────────────────────┘

    RIDER VIEW:
    ┌──────────────────────────────────────────────────────┐
    │ ASSIGNED → IN TRANSIT → DELIVERED                    │
    │                                                      │
    │ Statuses visible: Assigned, In Transit, Delivered    │
    │ Actions: Start Delivery, Confirm Delivery            │
    └──────────────────────────────────────────────────────┘

    Internal status (single source of truth in DB):
    PENDING → CONFIRMED → ASSIGNED → OUT_FOR_DELIVERY → DELIVERED
      │         │
      ├→ CANCELLED_BY_CUSTOMER
      ├→ CANCELLED_BY_RETAILER
      └→ REJECTED
```

**Fixes addressed:** #4 (retailer accepts/rejects), #10 (SMS orders entered into system by retailer)
**Owner feedback applied:** Order states segregated per role — customer, retailer, rider each see role-appropriate labels and actions

---

### 6. Delivery & Acknowledgement

**Actor:** Rider (on-site delivery)

```
Rider sees assigned order in app → taps "Start Delivery"
│   └─ Order status: OUT_FOR_DELIVERY
│       └─ Customer notified: "Rider is on the way"
│
├─ Rider arrives at customer location
│
├─ Delivery acknowledgement (multiple options — not QR-only):
│   │
│   ├─ OPTION A: QR Scan (preferred)
│   │   ├─ Customer shows order QR from their app
│   │   └─ Rider scans → delivery confirmed
│   │
│   ├─ OPTION B: Confirmation Code
│   │   ├─ Customer gives rider a 4-digit code shown in their app
│   │   └─ Rider enters code → delivery confirmed
│   │
│   └─ OPTION C: Rider-side confirm (fallback)
│       ├─ Rider taps "Mark Delivered" + takes optional photo
│       └─ Delivery confirmed (lower trust, flagged for retailer review)
│
├─ On confirmation:
│   ├─ Order status: DELIVERED
│   ├─ Customer's estimation resets (new full tank)
│   ├─ Refill log created automatically
│   ├─ Discount applied to final order record
│   └─ Both parties notified
│
└─ Customer's app resets:
    - Order cleared from home screen
    - Estimation restarts from full tank
    - New preemptly countdown begins
```

**Fixes addressed:** #6 (multiple confirmation methods), #16 (code/QR verifies right customer), #11 (minimal rider interaction)

---

### 7. Rider App Features

**Actor:** Rider

```
Rider Dashboard
├─ Today's Deliveries
│   - Assigned orders with status, address, LPG size
│   - Navigation/map link to customer address
│   - "Start Delivery" / "Mark Delivered" actions
│
├─ Upcoming Prospects
│   - Customers in preemptly zone (≤ retailer threshold, default 5 days) linked to their retailer
│   - Sorted by urgency (fewest days remaining first)
│   - Rider can note/flag prospects for retailer
│
├─ New Customer Registration
│   - Input customer details on first delivery
│   - Generate link QR / code for customer
│
├─ Delivery History
│   - Past deliveries with dates, amounts, customer info
│
└─ Sync
    - All data syncs to retailer web app
    - Works offline: queues updates, syncs when connected
```

**Fixes addressed:** #13 (defined rider features), #11 (streamlined interactions)

---

### 8. Retailer Web App Features

**Actor:** Retailer

```
Retailer Dashboard
├─ Overview Stats
│   - Total customers, active orders, running low count, deliveries this month
│
├─ Customer List
│   - All linked customers with preemptly state (Running Low / OK / New)
│   - Filter/sort by days remaining, last delivery, area
│   - Click customer → order history, estimation details
│
├─ Order Management
│   - Pending / Confirmed / Out for Delivery / Delivered / Rejected tabs
│   - Confirm, reject, assign rider, adjust discount
│   - Manual SMS order entry
│
├─ Rider Management
│   - List of riders linked to retailer
│   - Assign/reassign riders to orders
│   - View rider delivery history and performance
│   - Send rider notification: "Prospect list for today"
│
├─ Pricing & Discounts
│   - Set base price per LPG size (e.g., 11kg = 850 pesos)
│   - View/edit discount tiers (default tiered, customizable)
│   - Override discount on individual orders
│
├─ Notifications
│   - Send SMS reminder to customers in preemptly zone
│   - Push notification to riders for upcoming prospects
│
├─ Invite / Linking
│   - Store QR code and invite link for new customers
│   - Invite conversion stats
│
└─ Settings
    - Store name, contact phone, address, operating hours
    - Rider management (add/remove riders)
    - Notification preferences
```

**Fixes addressed:** #4 (order acceptance), #10 (SMS order entry), #13 (rider management defined)

---

### 9. Multi-Retailer Handling

```
Customer can be linked to multiple retailers
│
├─ Primary retailer: default for orders (set on first link)
├─ Customer can link additional retailers (scan QR / enter code)
├─ On reorder: customer selects which retailer to order from
│
├─ Unlinking:
│   ├─ Customer can unlink from retailer in settings
│   ├─ Retailer can remove customer from their list
│   └─ Order history is preserved even after unlinking
│
└─ Switching primary:
    └─ Customer can change default retailer in settings
```

**Fixes addressed:** #12 (multi-retailer support)

---

### 10. Order Channels & Fallbacks

**Primary channel:** In-app order (online → API)

**Fallback channels (when primary is unavailable):**

```
Channel              How it works                                    Who processes it
─────────────────────────────────────────────────────────────────────────────────────────
SMS (offline)        App composes formatted SMS → customer sends      Retailer enters into web app
                     → retailer sends confirmation SMS back           → becomes normal order

Missed call          Customer gives missed call to store number       Retailer sees missed call log
                     → system logs as order intent                    → calls back or creates order

Viber/Messenger      Customer messages store via bot/chat             Retailer enters into web app
                     (future: automated bot creates order)            → becomes normal order

Manual call          Customer calls store directly                    Retailer enters into web app
                                                                     → becomes normal order

Walk-in              Customer visits store physically                 Retailer logs delivery after
                                                                     the fact → refill recorded

Offline queue        Order saved locally in app                       Auto-syncs to API when
                     → syncs when connection restored                 connection restored
```

**All channels converge:** Every order ends up as a record in the system, regardless of how it was placed. The retailer web app is the single entry point for non-API orders.

---

### 11. Payment Handling

```
Phase 1 (MVP): Cash on Delivery only
├─ Base price set by retailer per LPG size
├─ Discount deducted from base price
├─ Rider collects cash, marks payment received
└─ Order record shows: base price, discount, final amount

Phase 2 (Future): Digital payments
├─ GCash / Maya integration
├─ In-app payment before delivery
└─ Payment confirmation triggers delivery dispatch
```

**Fixes addressed:** #14 (payment flow defined)

---

## Summary of Changes from v1

| # | Original Issue | Resolution | Owner Feedback |
|---|---------------|------------|----------------|
| 1 | Flat discount (50 pesos for all) | Tiered: 50/40/30/20/10/0 (defaults) | Fully retailer-customizable |
| 2 | No "days early" baseline | Defined: 5-day preemptly zone (default, range 1–10) | Retailer sets their own threshold |
| 3 | No cancel flow | Cancel available before OUT_FOR_DELIVERY | Segregated by customer/retailer |
| 4 | No retailer acceptance | Retailer confirms/rejects orders | Separate lifecycle views per role |
| 5 | Bloated QR data | Hybrid QR: ref ID + offline essentials | Supports offline scanning |
| 6 | QR-only acknowledgement | QR scan, code entry, rider confirm | + missed call, Viber/Messenger, manual call, walk-in |
| 7 | Must have app at first delivery | Setup-later path with card/sticker + manual code | — |
| 8 | No SMS acknowledgement | SMS is user-initiated, order tracked in app | Retailer sends confirmation SMS back |
| 9 | SMS parsing unreliable | Removed rider-side SMS parsing; retailer enters manually | — |
| 10 | SMS goes to store not rider | Retailer receives SMS, enters into system, assigns rider | — |
| 11 | Too many rider interactions | Streamlined: minimal taps, multiple confirm methods | — |
| 12 | Single retailer only | Multi-retailer linking with primary selection | — |
| 13 | Vague rider management | Defined rider features, dashboard, prospect list | — |
| 14 | No pricing/payment | Base price per size, COD for MVP, digital payments future | — |
| 15 | Locked LPG size | Editable per order | — |
| 16 | No customer verification | QR scan or confirmation code verifies identity | — |
