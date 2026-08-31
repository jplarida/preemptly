# LPG Usage & Reorder App - Product Strategy Document

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Target Market & User Segments](#4-target-market--user-segments)
5. [LPG Monitoring Methods](#5-lpg-monitoring-methods)
6. [MVP Definition](#6-mvp-definition)
7. [Product Features by Phase](#7-product-features-by-phase)
8. [User Experience & App Flow](#8-user-experience--app-flow)
9. [Business Model & Pricing Strategy](#9-business-model--pricing-strategy)
10. [Go-to-Market Strategy](#10-go-to-market-strategy)
11. [Global Expansion Strategy](#11-global-expansion-strategy)
12. [Technical Architecture](#12-technical-architecture)
13. [Roadmap & Phases](#13-roadmap--phases)
14. [Success Metrics & KPIs](#14-success-metrics--kpis)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Competitive Landscape](#16-competitive-landscape)
17. [Regulatory & Compliance](#17-regulatory--compliance)
18. [Data Portability & User Rights](#18-data-portability--user-rights)
19. [Team & Resource Requirements](#19-team--resource-requirements)
20. [Open Questions & Future Considerations](#20-open-questions--future-considerations)
21. [User Engagement & Retention Strategy](#21-user-engagement--retention-strategy)
22. [Gaps & Loopholes Checklist](#22-gaps--loopholes-checklist)

**Appendices**
- [Appendix A: Glossary](#appendix-a-glossary)
- [Appendix B: Sample User Journeys](#appendix-b-sample-user-journeys)
- [Appendix C: Hardware Integration Roadmap](#appendix-c-hardware-integration-roadmap)
- [Appendix D: Financial Model Details](#appendix-d-financial-model-details)

---

## 1. Executive Summary

### Vision
Build a mobile-first LPG usage tracking and reorder assistance platform that helps households and businesses avoid running out of gas, while providing retailers with demand visibility and customer retention tools.

### Strategic Positioning
- **For Users:** "This app helps you understand and manage your LPG consumption"
- **For Retailers:** "A free LPG usage & reorder assistant for your customers"
- **Core Principle:** "We help LPG users understand and manage their consumption — we don't tell them where to buy"

### Key Insight
> "You do not switch power by switching suppliers. You switch power by owning the habit and the data."

### Business Model Evolution
- **Phase 1:** Mobile app (retailer-distributed, free for users)
- **Phase 2:** Freemium with SMB upgrades
- **Phase 3:** Full SaaS platform with global reach

---

## 2. Problem Statement

### Core User Anxieties
LPG customers consistently face the same concerns:
- How much LPG is left?
- When will I run out?
- How do I avoid disruption?
- Is my usage normal or is there a leak?
- How do I easily reorder?

### Market Realities
- Most households and businesses have **no visibility** into their LPG consumption
- Reordering is **reactive** (wait until empty) rather than **proactive**
- Retailers have **no demand forecasting** — leading to inefficient deliveries
- Existing relationships are **sticky** — users don't switch suppliers easily

### The Opportunity
Build a **usage-first, user-owned, retailer-neutral** platform in a market where existing solutions are:
- Supplier/logistics-focused (not user-centric)
- Enterprise-heavy (not accessible to households/SMBs)
- Hardware-dependent (expensive, complex)

---

## 3. Solution Overview

### What the App Does
1. **Tracks LPG Usage** — Estimates consumption based on time, habits, and manual input
2. **Predicts Depletion** — Shows estimated days remaining
3. **Sends Alerts** — Notifies users before they run out
4. **Enables Easy Reordering** — One-tap refill requests
5. **Provides Insights** — Usage patterns, cost tracking, anomaly detection

### What the App Does NOT Do (Initially)
- Replace existing retailer relationships
- Require hardware sensors
- Create a marketplace with price competition
- Force supplier switching

---

## 4. Target Market & User Segments

### Primary Segments

| Segment | Description | LPG Model | App Value |
|---------|-------------|-----------|-----------|
| **Households** | Residential users, 1-2 tanks | Cylinder exchange | Avoid empty tank, alerts, convenience |
| **SMBs** | Restaurants, catering, food trucks | Cylinder exchange/refill | Usage tracking, cost optimization, multi-tank management |
| **Retailers/Distributors** | LPG suppliers and delivery services | N/A | Customer retention, demand visibility, analytics |

### Secondary Segments (Future)
- Industrial/Manufacturing
- Apartment/Condo central LPG systems
- Food trucks and mobile vendors

### User Profiles

| Profile | Tank Size | Usage Pattern | Reserve Tank? | App Fit |
|---------|-----------|---------------|---------------|---------|
| Light Home User | 11kg | 40-50 days/tank | No | Excellent |
| Heavy Home User | 11-22kg | 20-30 days/tank | Sometimes | Good |
| Restaurant | Multiple tanks | Daily heavy use | Yes | Good (analytics focus) |
| Catering | Variable | Event-based | Variable | Moderate |

---

## 5. LPG Monitoring Methods

### Method Comparison

| Method | Accuracy | Cost | Setup | Best For |
|--------|----------|------|-------|----------|
| **Time-Based Estimation** | Low-Medium | None | Very Easy | MVP, households |
| **Weight-Based** | Medium-High | Low | Easy | Homes, food trucks |
| **Flow-Based** | High | High | Hard | Restaurants, commercial |
| **Hybrid** | Very High | Medium | Medium | Premium users |

### MVP Approach: Time-Based Estimation + Manual Input
- No hardware dependency
- Uses: tank size, usage profile, last refill date, manual adjustments
- Outputs: estimated daily usage, remaining days, alert windows

### Consumption Reference Table (Philippine Context)

| Use Case | Daily Usage | 11kg Tank Duration |
|----------|-------------|-------------------|
| Light home cooking | 0.20-0.25 kg/day | 44-55 days |
| Moderate home cooking | 0.25-0.35 kg/day | 31-44 days |
| Heavy home cooking | 0.35-0.45 kg/day | 24-31 days |
| Small restaurant | 2-4 kg/day | 2.5-5.5 days |
| Medium restaurant | 4-8 kg/day | 1.3-2.5 days |

### Estimation Formula
```
Daily Usage = Appliance Rate × Hours Used
Remaining Days = Current LPG (kg) ÷ Daily Usage
```

---

## 6. MVP Definition

### MVP Scope

#### What MVP WILL Do
- Estimate LPG usage using hybrid model (time-based + history-based)
- Track days since last refill
- Show estimated refill window (range, not false precision)
- Send predictive alerts when approaching refill time
- Allow manual corrections and adjustments
- Enable one-tap reorder requests
- Learn and improve from actual refill data

#### What MVP WILL NOT Do
- Show fake precision ("68% remaining" without sensors)
- Real-time sensor tracking
- Leak detection
- Appliance-level monitoring
- Multi-supplier marketplace
- Price comparison

### MVP User Setup (Under 2 Minutes)

**Step 1: LPG Profile**
- Cylinder size (11kg, 22kg, etc.)
- Usage type (Home / Small Business)

**Step 2: Initial Estimation**
- "How would you describe your cooking?"
- Presets: Light / Moderate / Heavy (no technical numbers)
- Optional: Household size or business type

**Step 3: Start Tracking**
- App calculates initial estimate with wide range
- Clearly shows "This will get more accurate after your first refill"

---

### Hybrid Estimation System

The MVP uses a **two-component estimation system** that improves over time:

#### Component 1: Time-Based Estimation (Cold Start)

Used when user has no history (Day 1).

| Profile | Estimated Daily Usage | 11kg Tank Duration |
|---------|----------------------|-------------------|
| Light home | 0.20-0.25 kg/day | 44-55 days |
| Moderate home | 0.25-0.35 kg/day | 31-44 days |
| Heavy home | 0.35-0.45 kg/day | 24-31 days |
| Small restaurant | 2-4 kg/day | 2.5-5.5 days |

**Displayed as range, not single number:** "Estimated: 35-50 days"

#### Component 2: History-Based Calibration

Builds from actual refill data logged by user.

| Refills Logged | Estimation Method | Confidence |
|----------------|-------------------|------------|
| 0 | Time-based only | Low (±30-40%) |
| 1 | Time-based × correction factor | Medium (±20-25%) |
| 2 | Weighted average of history + time-based | Medium-High (±15-20%) |
| 3+ | History primary, time-based for adjustments | High (±10-15%) |

#### How Calibration Works

```
After first refill:
- Predicted: 40 days
- Actual: 44 days
- Correction factor: 44 ÷ 40 = 1.10

Next cycle:
- Base estimate: 40 days × 1.10 = 44 days
- Confidence increases
- Range narrows: "42-46 days" instead of "35-50 days"
```

#### Hybrid Formula (Simplified)

```
// Cold start (no history)
estimate = time_based_estimate
confidence = "low"
display_range = ±25-30%

// After N refills
correction_factor = average(actual_cycles) / average(predicted_cycles)
calibrated_estimate = time_based_estimate × correction_factor

// With user adjustment
if user_indicates("heavy_usage_this_week"):
    adjusted_estimate = calibrated_estimate × 0.85  // 15% reduction
elif user_indicates("light_usage_this_week"):
    adjusted_estimate = calibrated_estimate × 1.15  // 15% extension
else:
    adjusted_estimate = calibrated_estimate

// Confidence improves with data
if refill_count >= 3:
    confidence = "high"
    display_range = ±10-15%
```

---

### User Engagement Model

#### Core Principle
**Ask rarely, make it easy, never be annoying.**

#### User Actions Required

| Action | Frequency | Effort | Required? |
|--------|-----------|--------|-----------|
| **Log refill** | Every 30-50 days (home) | 1 tap | Critical |
| **Adjust usage** | Occasionally (unusual weeks) | 1 tap | Optional |
| **Confirm accuracy** | After each cycle | 1 tap | Optional |

#### Logging Frequency by User Type

| User Type | Refill Frequency | Logging Events/Month |
|-----------|------------------|---------------------|
| Home (light) | Every 40-50 days | ~0.7 logs |
| Home (heavy) | Every 25-35 days | ~1.0 logs |
| Small business | Every 5-10 days | ~4-6 logs |

**This is very low friction** — most users log less than once per month.

---

### Refill Logging Flow

#### When to Prompt

| Trigger | Prompt Type | Message |
|---------|-------------|---------|
| User opens app near estimated refill | Soft in-app prompt | "Running low? Did you refill?" |
| Estimated refill date passed | Push notification | "Time to check your tank" |
| 5+ days past estimated date | Stronger prompt | "Have you refilled? This helps us learn" |

#### Logging Interface (1 Tap)

```
┌─────────────────────────────────┐
│  Did you get a new tank?        │
│                                 │
│  [Yes, just now]                │
│  [Yes, a few days ago]          │
│  [Not yet]                      │
└─────────────────────────────────┘
```

If "Yes, a few days ago":
```
┌─────────────────────────────────┐
│  When did you refill?           │
│                                 │
│  [Yesterday]                    │
│  [2-3 days ago]                 │
│  [Pick date...]                 │
└─────────────────────────────────┘
```

#### Smart Defaults
- Assume today's date if user taps "Yes, just now"
- Assume same tank size as before
- Don't require price or other fields (optional)

---

### Usage Adjustment Flow

#### When to Show (Passive, Not Forced)

| Location | Visibility | User Action |
|----------|------------|-------------|
| Home screen | Small card/button | Tap if applicable |
| After opening app | Dismissible prompt | Tap or ignore |
| Push notification | Never | — |

#### Adjustment Interface (Optional)

```
┌─────────────────────────────────┐
│  Anything unusual this week?    │
│                                 │
│  [Cooked more 🔥]  [Cooked less]│
│  [Normal week]     [Dismiss ✕]  │
└─────────────────────────────────┘
```

| Button | Effect on Estimate | Example Scenario |
|--------|-------------------|------------------|
| Cooked more | -15% from current estimate | Holiday, party, guests |
| Cooked less | +15% from current estimate | Travel, ate out |
| Normal week | No change | Default |
| Dismiss | No change, hide prompt | User doesn't want to answer |

**Users are never required to adjust.** The system works without it.

---

### What If User Doesn't Log Anything?

#### Scenario: User Never Logs Refills

The system degrades gracefully:

| Behavior | App Response |
|----------|--------------|
| Never logs refills | Falls back to time-based only, wide ranges |
| Ignores prompts | Continues showing estimates, reduces prompt frequency |
| Opens app rarely | Sends occasional gentle reminders |
| Completely inactive | App still works as basic reminder |

#### Fallback Behavior Levels

| Level | User Engagement | System Behavior |
|-------|-----------------|-----------------|
| **Full** | Logs refills, occasional adjustments | Hybrid estimation, improving accuracy |
| **Partial** | Logs refills sometimes | Mixed history + time-based, wider ranges |
| **Minimal** | Rarely logs anything | Time-based only, very wide ranges |
| **None** | No engagement at all | Simple "days since setup" counter |

#### "Forgotten Refill" Detection

When estimated refill date passes with no log:

```
Day 42 (estimated empty): No log received

App response:
┌─────────────────────────────────┐
│  ⚠️ Quick check-in              │
│                                 │
│  Based on your pattern, you     │
│  might be running low.          │
│                                 │
│  [I refilled already]           │
│  [Still have gas]               │
│  [Remind me later]              │
└─────────────────────────────────┘
```

**If "Still have gas":**
- App extends estimate by 20%
- Learns: "this user uses less than profile suggests"
- Recalibrates time-based model

**If ignored:**
- App continues showing "X days since last refill"
- Sends one more reminder in 5-7 days
- Then stops prompting (avoids annoyance)

#### Minimal Mode (Zero Engagement)

Even with no user input, app still provides value:

```
┌─────────────────────────────────┐
│  Days since tank setup: 38      │
│                                 │
│  Similar users typically        │
│  refill around 35-50 days.      │
│                                 │
│  [Order Now]  [I'm Fine]        │
└─────────────────────────────────┘
```

---

### What If User Logs Untruthfully?

#### Why Users Might Provide Bad Data

| Reason | Likelihood | Impact |
|--------|------------|--------|
| Lazy tapping (random answer) | Medium | Noise in data |
| Wrong date (forgot actual date) | Medium | Inaccurate history |
| Gaming for incentives | Low | Depends on incentive design |
| Genuine mistake | Low | Occasional error, minimal impact |

#### Handling Bad Data

##### A. Outlier Detection (Silent, Backend)

```python
# Flag suspicious entries
average_cycle = 42 days
new_entry = 15 days  # Unusually short

if new_entry < (average_cycle * 0.5):  # Less than 50% of average
    flag_as_outlier = True
    weight_in_calculation = 0.3  # Reduced weight
```

##### B. Confirmation for Anomalies

```
┌─────────────────────────────────┐
│  That's earlier than usual!     │
│                                 │
│  Your typical cycle is 40-45    │
│  days, but this was day 15.     │
│                                 │
│  [Yes, this is correct]         │
│  [Let me fix the date]          │
└─────────────────────────────────┘
```

##### C. Self-Correcting Over Time

| Data Points | Impact of 1 Bad Entry |
|-------------|----------------------|
| 1-2 cycles | High (could skew heavily) |
| 3-4 cycles | Medium (noticeable but not breaking) |
| 5+ cycles | Low (averaged out) |
| 10+ cycles | Negligible (statistical noise) |

##### D. Resilience Strategy

| Data Quality | System Response |
|--------------|-----------------|
| Good data (consistent logs) | Tight ranges, high confidence |
| Some noise (occasional errors) | Wider ranges, medium confidence |
| Mostly bad data | Very wide ranges, falls back to defaults |
| No data | Profile-based estimation only |

**The system should never fully break** — it just becomes less precise.

---

### Prediction Accuracy Requirements

#### Accuracy Thresholds by Stage

| Stage | Expected Accuracy | Display Range | Confidence Level |
|-------|-------------------|---------------|------------------|
| Cold start (0 refills) | ±30-40% | "35-50 days" | Low |
| After 1 refill | ±20-25% | "40-48 days" | Medium |
| After 3 refills | ±10-15% | "42-46 days" | High |
| With adjustment input | ±8-12% | "40-44 days" | High |

#### How Accuracy Is Measured

1. **Primary:** Compare predicted refill date vs actual logged refill date
2. **Secondary:** Optional "Was this accurate?" prompt after each cycle
3. **Implicit:** Frequency of manual adjustments (high frequency = low accuracy)

#### Accuracy Fallback Strategy

If accuracy consistently fails (>±40% error after 3 months):

| Action | Description |
|--------|-------------|
| Widen displayed ranges | Show "30-55 days" instead of "40-45 days" |
| Increase manual input emphasis | Prompt user more often for adjustments |
| Shorten alert window | Alert at 60% instead of 80% of estimated cycle |
| Segment user | Mark profile as "high variability" |
| Suggest sensor | "Want more accuracy? Consider a tank scale" (Phase 2) |

---

### UI Display Guidelines

#### What to Show (Honest)

| Element | Good | Bad |
|---------|------|-----|
| Days elapsed | "Day 35 of ~42" | — |
| Remaining estimate | "~7-10 days left" | "7.3 days left" |
| Gauge/progress | "████████░░ ~80%" | "83.7% remaining" |
| Confidence | "Based on 3 refills" | (hidden) |

#### What NOT to Show (False Precision)

| Avoid | Why |
|-------|-----|
| "68.5% remaining" | Implies sensor-level accuracy |
| "Exactly 23 days left" | Impossible to know precisely |
| "4.7 kg remaining" | Cannot measure without sensor |
| Hard countdown timer | Creates anxiety, often wrong |

#### Example Dashboard (MVP)

**New User (No History):**
```
┌─────────────────────────────────┐
│  Getting to know your usage...  │
│                                 │
│  Days since refill: 12          │
│  ██░░░░░░░░░░░░░░░░            │
│                                 │
│  Estimated cycle: 35-50 days    │
│  (Will improve after 1st refill)│
│                                 │
│  [I'm Running Low] [Order Now]  │
└─────────────────────────────────┘
```

**After 3+ Refills (Calibrated):**
```
┌─────────────────────────────────┐
│  Your typical cycle: 42-45 days │
│                                 │
│  Day 35 of ~43                  │
│  ████████████████░░░░ (~80%)    │
│                                 │
│  Refill window: 7-10 days       │
│  Based on 5 previous refills    │
│                                 │
│  [Cooked more?] [Order Now]     │
└─────────────────────────────────┘
```

---

### MVP Data Model

```json
{
  "user_id": "USER-001",
  "tank": {
    "tank_id": "TANK-001",
    "capacity_kg": 11,
    "unit": "kg",
    "model": "exchange"
  },
  "profile": {
    "type": "home",
    "usage_level": "moderate",
    "initial_estimate_days": 40
  },
  "estimation": {
    "time_based_estimate_days": 40,
    "correction_factor": 1.075,
    "calibrated_estimate_days": 43,
    "current_adjustment": "normal",
    "confidence": "high"
  },
  "history": {
    "refill_count": 5,
    "cycles": [44, 42, 45, 41, 43],
    "average_days": 43,
    "std_deviation": 1.58
  },
  "current_cycle": {
    "start_date": "2026-01-15",
    "days_elapsed": 35,
    "estimated_total_days": 43,
    "estimated_remaining_days": 8,
    "display_range": "7-10 days"
  },
  "data_quality": {
    "outliers_detected": 0,
    "missed_logs": 1,
    "engagement_level": "good"
  },
  "region": "PH"
}
```

---

### MVP Feature Summary (Consumer)

| Feature | Home User | Small Business |
|---------|-----------|----------------|
| Initial time-based estimate | ✅ | ✅ |
| History-based calibration | ✅ | ✅ |
| Refill logging | ✅ (every 30-50 days) | ✅ (every 5-10 days) |
| Usage adjustment (optional) | ✅ | ✅ |
| Range-based display | ✅ | ✅ |
| Graceful degradation | ✅ | ✅ |
| Outlier detection | ✅ | ✅ |
| One-tap reorder | ✅ | ✅ |
| Multi-tank support | ❌ (Phase 2) | ❌ (Phase 2) |
| Analytics dashboard | ❌ (Phase 2) | ❌ (Phase 2 Premium) |

---

### Retailer MVP (Phase 1)

#### Retailer Problem Statement

| Pain Point | Current Situation | MVP Solution |
|------------|-------------------|--------------|
| No visibility into customer needs | Wait for customer to call | See which customers are running low |
| Panic/last-minute orders | Reactive, inefficient deliveries | Get early reorder notifications |
| Can't plan delivery routes | Ad-hoc scheduling | Basic visibility into upcoming demand |
| Looks unprofessional | Manual tracking, paper records | Branded app for customers |
| Customer retention risk | No loyalty mechanism | App creates stickiness |

#### What Retailer MVP WILL Do

- Register and create retailer profile
- Generate unique invite links/codes for customers
- View list of customers using the app
- Receive order notifications (push + optional SMS)
- See which customers are running low (estimated status)
- Mark orders as completed
- Basic order history

#### What Retailer MVP WILL NOT Do (Phase 1)

| Feature | Deferred To |
|---------|-------------|
| Detailed analytics dashboard | Phase 2 |
| Demand forecasting | Phase 2 |
| Route optimization | Phase 3 |
| In-app customer messaging | Phase 2 |
| Revenue/payment tracking | Phase 2 |
| Multi-location management | Phase 3 |
| API integration | Phase 3 |
| Inventory management | Phase 3 |

---

### Customer ↔ Retailer Linking Mechanism

#### Linking Philosophy

| Principle | Rationale |
|-----------|-----------|
| **Customer-initiated** | Customer chooses their retailer, not assigned |
| **Easy to link** | One tap from invite link or code |
| **Changeable** | Customer can switch retailers (but discouraged early) |
| **Single retailer (Phase 1)** | Simplicity; multi-retailer in Phase 2+ |

#### Linking Methods

##### Method 1: Invite Link (Primary — Recommended)

```
Retailer gets unique link:
https://app.lpgtracker.com/join/mangpedro123

Customer clicks link → App opens/installs → Auto-linked to retailer
```

**Flow:**
```
Retailer shares link (SMS, Facebook, Viber, in-person)
         ↓
Customer clicks link
         ↓
If app installed: Opens app, shows "Link to Mang Pedro's LPG?"
If not installed: Opens app store, after install prompts linking
         ↓
Customer confirms → Linked
```

**Advantages:**
- One-click linking
- Works via any messaging platform
- Trackable (retailer knows which links converted)

##### Method 2: QR Code (For In-Person)

```
Retailer has QR code (printed on receipt, flyer, or shown on phone)
         ↓
Customer scans with phone camera
         ↓
Same flow as invite link
```

**Use Cases:**
- Printed on delivery receipts
- Posted at retailer's store
- On business cards
- On LPG tank sticker (optional)

##### Method 3: Retailer Code (Fallback)

```
Retailer has short code: PEDRO123
         ↓
Customer opens app → Settings → "Link to Retailer"
         ↓
Enters code → Linked
```

**Use Cases:**
- When link doesn't work
- Verbal sharing (phone call, in-person)
- Radio/TV advertising (future)

#### Linking Interface — Customer Side

**Scenario A: Customer clicks invite link (no account yet)**

```
┌─────────────────────────────────────────────┐
│                                             │
│  🏪 You've been invited by                  │
│                                             │
│  MANG PEDRO'S LPG                          │
│  Brgy. San Antonio, Quezon City             │
│                                             │
│  Join to:                                   │
│  ✓ Track your LPG usage                    │
│  ✓ Get refill reminders                    │
│  ✓ Order refills easily                    │
│                                             │
│  [Get Started with Mang Pedro's]           │
│                                             │
│  Already have an account? [Sign In]        │
└─────────────────────────────────────────────┘
```

**Scenario B: Customer clicks invite link (has account, no retailer)**

```
┌─────────────────────────────────────────────┐
│                                             │
│  🏪 Link to Mang Pedro's LPG?              │
│                                             │
│  Brgy. San Antonio, Quezon City             │
│  ⭐ 4.8 rating • 234 customers             │
│                                             │
│  When you order through the app,           │
│  your request goes directly to them.       │
│                                             │
│  [Yes, Link My Account]                    │
│                                             │
│  [Not Now]                                 │
└─────────────────────────────────────────────┘
```

**Scenario C: Customer clicks invite link (has account, different retailer)**

```
┌─────────────────────────────────────────────┐
│                                             │
│  🏪 Switch to Mang Pedro's LPG?            │
│                                             │
│  You're currently linked to:               │
│  Juan's Gas Supply                          │
│                                             │
│  Switching means your orders will go       │
│  to Mang Pedro's instead.                  │
│                                             │
│  [Switch Retailer]                         │
│                                             │
│  [Keep Current Retailer]                   │
└─────────────────────────────────────────────┘
```

#### Linking Interface — Retailer Side

**Invite Management Screen:**

```
┌─────────────────────────────────────────────┐
│  Invite Customers                           │
├─────────────────────────────────────────────┤
│                                             │
│  Your Invite Link:                         │
│  ┌─────────────────────────────────────┐   │
│  │ https://app.lpgtracker.com/join/... │   │
│  └─────────────────────────────────────┘   │
│  [Copy Link]  [Share via...]              │
│                                             │
│  Your QR Code:                             │
│  ┌─────────────┐                           │
│  │ [QR IMAGE]  │  [Download]  [Print]      │
│  └─────────────┘                           │
│                                             │
│  Your Code: PEDRO123                       │
│  (For customers to enter manually)         │
│                                             │
│  ─────────────────────────────────────     │
│  📊 Invite Stats                           │
│  • Link clicks: 67                         │
│  • Successful joins: 43                    │
│  • This month: 12 new customers            │
└─────────────────────────────────────────────┘
```

---

### Retailer Onboarding Flow

#### Step-by-Step Registration

```
Step 1: Basic Information
┌─────────────────────────────────────────────┐
│  Register Your Business                     │
│                                             │
│  Business Name:                            │
│  [Mang Pedro's LPG                    ]    │
│                                             │
│  Your Name:                                │
│  [Pedro Santos                        ]    │
│                                             │
│  Mobile Number:                            │
│  [0917-xxx-xxxx                       ]    │
│                                             │
│  [Continue]                                │
└─────────────────────────────────────────────┘

Step 2: Business Location
┌─────────────────────────────────────────────┐
│  Where's your business?                     │
│                                             │
│  Address:                                  │
│  [123 Main St, Brgy. San Antonio      ]    │
│                                             │
│  City/Municipality:                        │
│  [Quezon City                         ]    │
│                                             │
│  [Use Current Location 📍]                 │
│                                             │
│  [Continue]                                │
└─────────────────────────────────────────────┘

Step 3: Verification (Simple for MVP)
┌─────────────────────────────────────────────┐
│  Verify Your Number                         │
│                                             │
│  We sent a code to 0917-xxx-xxxx           │
│                                             │
│  Enter code:                               │
│  [______]                                  │
│                                             │
│  [Verify & Complete]                       │
│                                             │
│  Didn't receive? [Resend]                  │
└─────────────────────────────────────────────┘

Step 4: Done!
┌─────────────────────────────────────────────┐
│  ✅ You're all set!                         │
│                                             │
│  Welcome, Mang Pedro's LPG                 │
│                                             │
│  Next steps:                               │
│  1. Share your invite link with customers  │
│  2. Wait for them to join                  │
│  3. Start receiving orders!                │
│                                             │
│  [Share Invite Link Now]                   │
│                                             │
│  [Go to Dashboard]                         │
└─────────────────────────────────────────────┘
```

---

### Retailer Dashboard (MVP)

#### Main Dashboard View

```
┌─────────────────────────────────────────────┐
│  🏪 Mang Pedro's LPG                        │
│  Good morning, Pedro!                       │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │   47    │  │    3    │  │    8    │     │
│  │Customers│  │ Pending │  │Run. Low │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│                                             │
├─────────────────────────────────────────────┤
│  🔔 Pending Orders                          │
│  ┌─────────────────────────────────────┐   │
│  │ 🔴 Maria Santos                     │   │
│  │    Requested: Today, 8:30 AM        │   │
│  │    Address: 45 Rizal St, Brgy. 123  │   │
│  │    [View] [Mark Completed]          │   │
│  ├─────────────────────────────────────┤   │
│  │ 🟡 Juan Dela Cruz                   │   │
│  │    Requested: Yesterday, 4:15 PM    │   │
│  │    Address: 78 Mabini St, Brgy. 456 │   │
│  │    [View] [Mark Completed]          │   │
│  ├─────────────────────────────────────┤   │
│  │ 🟡 Ana Reyes                        │   │
│  │    Requested: 2 days ago            │   │
│  │    Address: 12 Luna St, Brgy. 789   │   │
│  │    [View] [Mark Completed]          │   │
│  └─────────────────────────────────────┘   │
│  [View All Orders]                         │
│                                             │
├─────────────────────────────────────────────┤
│  ⚠️ Customers Running Low                   │
│  These customers may order soon             │
│  ┌─────────────────────────────────────┐   │
│  │ Carlo's Restaurant    ~3 days left  │   │
│  │ Rosa Martinez         ~5 days left  │   │
│  │ Ben's Carinderia      ~5 days left  │   │
│  │ +5 more customers                    │   │
│  └─────────────────────────────────────┘   │
│  [View All]                                │
│                                             │
├─────────────────────────────────────────────┤
│  [📨 Invite Customers]  [⚙️ Settings]       │
└─────────────────────────────────────────────┘
```

#### Customer List View

```
┌─────────────────────────────────────────────┐
│  👥 Your Customers (47)                     │
│  [Search...]                    [Filter ▼]  │
├─────────────────────────────────────────────┤
│                                             │
│  Running Low (8)                            │
│  ┌─────────────────────────────────────┐   │
│  │ 🔴 Carlo's Restaurant               │   │
│  │    Est. ~3 days left • Business     │   │
│  │    Last order: 8 days ago           │   │
│  ├─────────────────────────────────────┤   │
│  │ 🟠 Rosa Martinez                    │   │
│  │    Est. ~5 days left • Home         │   │
│  │    Last order: 37 days ago          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Okay for Now (32)                         │
│  ┌─────────────────────────────────────┐   │
│  │ 🟢 Maria Santos                     │   │
│  │    Est. ~15 days left • Home        │   │
│  │    Last order: 28 days ago          │   │
│  ├─────────────────────────────────────┤   │
│  │ 🟢 Juan Dela Cruz                   │   │
│  │    Est. ~22 days left • Home        │   │
│  │    Last order: 20 days ago          │   │
│  └─────────────────────────────────────┘   │
│  [Load More...]                            │
│                                             │
│  New / No Data Yet (7)                     │
│  ┌─────────────────────────────────────┐   │
│  │ ⚪ Pedro Reyes                      │   │
│  │    Just joined • Home               │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

#### Order Detail View

```
┌─────────────────────────────────────────────┐
│  ← Back                      Order #1234   │
├─────────────────────────────────────────────┤
│                                             │
│  👤 Maria Santos                           │
│  📱 0917-xxx-xxxx                          │
│  📍 45 Rizal St, Brgy. San Antonio         │
│     Quezon City                             │
│                                             │
│  ─────────────────────────────────────     │
│                                             │
│  📦 Order Details                          │
│  Tank size: 11kg                           │
│  Requested: Today, 8:30 AM                 │
│  Status: Pending                           │
│                                             │
│  ─────────────────────────────────────     │
│                                             │
│  📊 Customer History                       │
│  • Avg. cycle: 42 days                     │
│  • Total orders via app: 5                 │
│  • Customer since: June 2025               │
│                                             │
│  ─────────────────────────────────────     │
│                                             │
│  [📞 Call Customer]                        │
│                                             │
│  [✅ Mark as Completed]                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

### Order Flow (End-to-End)

#### Complete Order Journey

```
┌─────────────────────────────────────────────────────────────┐
│                     CUSTOMER SIDE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Customer sees "~5 days left"                            │
│           ↓                                                  │
│  2. Customer taps [Order Now]                               │
│           ↓                                                  │
│  3. Confirmation screen:                                    │
│     "Request refill from Mang Pedro's LPG?"                 │
│     Tank: 11kg                                              │
│     Address: 45 Rizal St...                                 │
│     [Confirm Order]                                         │
│           ↓                                                  │
│  4. Order submitted                                         │
│     "Your request has been sent!                            │
│      Mang Pedro's will contact you soon."                   │
│           ↓                                                  │
│  5. Customer waits                                          │
│           ↓                                                  │
│  6. Delivery arrives                                        │
│           ↓                                                  │
│  7. Customer confirms in app (or auto-confirmed by retailer)│
│     [I received my tank]                                    │
│           ↓                                                  │
│  8. Tank resets, new cycle begins                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     RETAILER SIDE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Retailer receives notification:                         │
│     "🔔 New order from Maria Santos"                        │
│           ↓                                                  │
│  2. Retailer opens app, sees order in Pending list          │
│           ↓                                                  │
│  3. Retailer views order details                            │
│     • Customer info, address, phone                         │
│     • Tank size                                             │
│           ↓                                                  │
│  4. Retailer calls customer if needed                       │
│           ↓                                                  │
│  5. Retailer delivers tank                                  │
│           ↓                                                  │
│  6. Retailer taps [Mark as Completed]                       │
│           ↓                                                  │
│  7. Customer's tank resets automatically                    │
│           ↓                                                  │
│  8. Order moves to history                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Order States

| State | Customer Sees | Retailer Sees | Triggered By |
|-------|--------------|---------------|--------------|
| **Pending** | "Request sent, waiting for delivery" | Order in Pending list | Customer submits order |
| **Completed** | "Tank refilled!" + tank resets | Order in History | Retailer marks complete |
| **Cancelled** | "Order cancelled" | Order removed | Customer cancels (within time limit) |

---

### Notification System

#### Retailer Notifications (Phase 1)

| Event | Notification Type | Message |
|-------|-------------------|---------|
| New order | Push + SMS (optional) | "🔔 New order from Maria Santos" |
| Order pending >24hrs | Push | "⏰ Reminder: Order from Juan still pending" |
| New customer joined | Push | "👋 New customer: Rosa Martinez joined via your link" |

#### Customer Notifications (Phase 1)

| Event | Notification Type | Message |
|-------|-------------------|---------|
| Order confirmed | Push | "✅ Your order has been sent to Mang Pedro's" |
| Order completed | Push | "🎉 Tank refilled! Your new cycle has started" |
| Running low alert | Push | "⚠️ You may run out in ~5 days. Order now?" |

#### SMS Configuration (Retailer)

```
┌─────────────────────────────────────────────┐
│  📱 SMS Notifications                       │
├─────────────────────────────────────────────┤
│                                             │
│  Receive SMS for new orders?               │
│  [Toggle: ON/OFF]                          │
│                                             │
│  Phone number: 0917-xxx-xxxx               │
│  [Change]                                  │
│                                             │
│  Note: Standard SMS rates may apply        │
│                                             │
└─────────────────────────────────────────────┘
```

---

### Retailer Data Model (MVP)

```json
{
  "retailer_id": "RET-001",
  "business": {
    "name": "Mang Pedro's LPG",
    "owner_name": "Pedro Santos",
    "phone": "0917-xxx-xxxx",
    "address": {
      "street": "123 Main St",
      "barangay": "San Antonio",
      "city": "Quezon City",
      "coordinates": { "lat": 14.6516, "lng": 121.0494 }
    }
  },
  "invite": {
    "code": "PEDRO123",
    "link": "https://app.lpgtracker.com/join/mangpedro123",
    "qr_code_url": "https://...",
    "stats": {
      "total_clicks": 67,
      "total_joins": 43,
      "joins_this_month": 12
    }
  },
  "settings": {
    "sms_notifications": true,
    "notification_phone": "0917-xxx-xxxx"
  },
  "stats": {
    "total_customers": 47,
    "active_customers": 42,
    "pending_orders": 3,
    "customers_running_low": 8,
    "total_orders_completed": 156
  },
  "created_at": "2025-06-15",
  "region": "PH"
}
```

---

### Customer-Retailer Link Data Model

```json
{
  "link_id": "LINK-001",
  "customer_id": "USER-001",
  "retailer_id": "RET-001",
  "linked_at": "2025-07-20",
  "linked_via": "invite_link",
  "status": "active",
  "order_count": 5,
  "last_order_date": "2026-01-10"
}
```

---

### Privacy & Data Visibility

#### What Retailer Can See About Customer

| Data | Visible | Rationale |
|------|---------|-----------|
| Name | ✅ | Needed for service |
| Phone number | ✅ | Needed to contact |
| Address | ✅ | Needed for delivery |
| Tank size | ✅ | Needed for order |
| Estimated days left | ✅ (range only) | Core value prop |
| Order history (with this retailer) | ✅ | Business relationship |
| Exact usage data | ❌ | Privacy, not needed |
| Historical cycles (detailed) | ❌ | Privacy |
| Usage adjustments | ❌ | Privacy |

#### What Retailer CANNOT See

- Customer's exact daily consumption
- Detailed usage patterns
- Data from before linking
- Other retailers customer may have used
- Customer's internal notes

---

### MVP Feature Summary (Retailer)

| Feature | Included in MVP? | Notes |
|---------|------------------|-------|
| Retailer registration | ✅ | Simple 3-step flow |
| Invite link generation | ✅ | Unique per retailer |
| QR code generation | ✅ | For in-person sharing |
| Manual code entry | ✅ | Fallback method |
| Customer list view | ✅ | With status indicators |
| "Running low" visibility | ✅ | Range only, not exact |
| Order notifications | ✅ | Push + optional SMS |
| Order management | ✅ | View, complete orders |
| Basic invite stats | ✅ | Clicks, joins |
| Customer messaging | ❌ | Phase 2 |
| Analytics dashboard | ❌ | Phase 2 |
| Demand forecasting | ❌ | Phase 2 |
| Route optimization | ❌ | Phase 3 |
| Multi-location | ❌ | Phase 3 |
| API access | ❌ | Phase 3 |

---

### Retailer MVP Platform Decision

#### Option A: Same App, Different Mode

```
One app with role switching:
- Customer downloads "LPG Tracker"
- Customer can also register as retailer
- App UI changes based on role
```

**Pros:** Single app to maintain, customers can become retailers
**Cons:** More complex app, potential confusion

#### Option B: Separate Retailer App

```
Two apps:
- "LPG Tracker" for customers
- "LPG Tracker Business" for retailers
```

**Pros:** Cleaner separation, tailored experiences
**Cons:** Two apps to maintain, more dev effort

#### Option C: Web Dashboard for Retailers (Recommended for MVP)

```
- Mobile app for customers
- Simple web dashboard for retailers
- Retailers can also receive notifications via mobile web/SMS
```

**Pros:** Faster to build, retailers often at desk/shop, easier to view customer list
**Cons:** Less mobile for on-the-go retailers

#### Recommendation

**Phase 1:** Option C — Web dashboard for retailers + SMS notifications
**Phase 2:** Add mobile app for retailers OR add retailer mode to main app

---

## 7. Product Features by Phase

### Phase 1: Core MVP (0-9 months)

See **Section 6: MVP Definition** for detailed Phase 1 documentation including:
- Consumer MVP (Home & Small Business)
- Retailer MVP
- Customer-Retailer Linking

#### Phase 1 Feature Summary

| Feature | User Type | Priority |
|---------|-----------|----------|
| Tank registration | All | P0 |
| Hybrid estimation (time-based + history) | All | P0 |
| Manual input/adjustment | All | P0 |
| Low LPG alerts | All | P0 |
| One-tap reorder request | All | P0 |
| Refill logging | All | P0 |
| Graceful degradation | All | P0 |
| Basic usage history | All | P1 |
| Retailer registration | Retailers | P0 |
| Customer invite system | Retailers | P0 |
| Order notifications | Retailers | P0 |
| Basic customer list | Retailers | P1 |
| "Running low" visibility | Retailers | P1 |

---

### Phase 2: Enhanced Features & Monetization (9-18 months)

#### Phase 2 Goals

| Goal | Description |
|------|-------------|
| **Monetization** | Introduce premium tiers and start generating revenue |
| **Retention** | Deepen user engagement through analytics and insights |
| **Scale** | Expand retailer network and regional coverage |
| **Intelligence** | Leverage collected data for predictions and forecasting |

---

#### Phase 2: Consumer Features (Home & Small Business)

##### Premium Tier Introduction

| Feature | Free Tier | Premium Tier |
|---------|-----------|--------------|
| Basic alerts | ✅ | ✅ |
| Single tank tracking | ✅ | ✅ |
| Range-based estimates | ✅ | ✅ |
| Refill logging | ✅ | ✅ |
| Abnormal usage alerts | ✅ | ✅ |
| **Multi-tank support** | ❌ | ✅ |
| **Usage analytics** | ❌ | ✅ |
| **Historical trends** | ❌ | ✅ |
| **Cost tracking** | ❌ | ✅ |
| **Data export** | ❌ | ✅ |
| **Sensor integration** | ❌ | ✅ |

##### Feature 1: Multi-Tank Support (Premium)

For households with backup tanks or businesses with multiple tanks.

**Use Cases:**
- Home with main + reserve tank
- Restaurant with multiple cooking stations
- Business with indoor + outdoor tanks

**Dashboard View:**
```
┌─────────────────────────────────────────────┐
│  Your Tanks                                 │
├─────────────────────────────────────────────┤
│                                             │
│  🔵 Main Tank (Kitchen)                     │
│     Day 35 of ~43 • ~8 days left           │
│     ████████████████░░░░                   │
│     [View Details] [Order]                 │
│                                             │
│  🟢 Backup Tank (Storage)                   │
│     Full • Last refilled 5 days ago        │
│     ████████████████████                   │
│     [View Details] [Swap to Active]        │
│                                             │
│  [+ Add Tank]                              │
│                                             │
└─────────────────────────────────────────────┘
```

**Multi-Tank Logic:**
- Each tank tracked independently
- Alerts per tank
- Combined view option ("Total LPG across all tanks")
- Swap active tank when main runs out

##### Feature 2: Usage Analytics (Premium)

**Analytics Dashboard:**
```
┌─────────────────────────────────────────────┐
│  📊 Your Usage Analytics                    │
├─────────────────────────────────────────────┤
│                                             │
│  Your Pattern                              │
│  ─────────────────────────────────────     │
│  Average cycle: 43 days                    │
│  Shortest: 38 days (Dec - holidays)        │
│  Longest: 48 days (Sep - traveled)         │
│  Consistency: Good (±3 days)               │
│                                             │
│  Monthly Consumption                       │
│  ─────────────────────────────────────     │
│  Jan ████████ 11kg                         │
│  Dec ██████████ 13kg (holiday cooking)     │
│  Nov ████████ 11kg                         │
│  Oct ████████ 10kg                         │
│  Sep ██████ 8kg (traveled)                 │
│                                             │
│  Trend: Stable (no significant change)     │
│                                             │
│  6-Month Usage: ~63kg                      │
│  Projected Yearly: ~126kg                  │
│                                             │
└─────────────────────────────────────────────┘
```

**Insights Provided:**
- Average cycle length
- Usage trend (increasing, decreasing, stable)
- Seasonal patterns
- Anomaly detection ("December was 30% higher than average")

##### Feature 3: Cost Tracking (Premium)

**Cost Dashboard:**
```
┌─────────────────────────────────────────────┐
│  💰 Cost Tracking                           │
├─────────────────────────────────────────────┤
│                                             │
│  Summary                                   │
│  ─────────────────────────────────────     │
│  This Month: ₱950                          │
│  Last Month: ₱850                          │
│  Year to Date: ₱10,200                     │
│                                             │
│  Averages                                  │
│  ─────────────────────────────────────     │
│  Per refill: ₱920                          │
│  Per month: ₱850                           │
│  Per kg: ₱84                               │
│                                             │
│  Price History                             │
│  ─────────────────────────────────────     │
│  Jan 2026: ₱950 (+₱30 from Dec)           │
│  Dec 2025: ₱920                            │
│  Nov 2025: ₱920                            │
│                                             │
│  [Log Price] when you refill               │
│                                             │
└─────────────────────────────────────────────┘
```

**How Price Logging Works:**
- Optional field when logging refill
- "How much did you pay? [₱___]"
- Can skip if user doesn't want to track

##### Feature 4: Abnormal Usage Alerts (Free)

Available to all users, not just premium.

**Alert Types:**

| Alert | Trigger | Message |
|-------|---------|---------|
| High usage | >130% of average | "Usage this week is higher than usual" |
| Very high usage | >150% of average | "Unusually high usage — check appliances?" |
| Sudden drop | Usage dropped significantly | "Using less than usual?" |

**Alert UI:**
```
┌─────────────────────────────────────────────┐
│  🔔 Higher than usual usage                 │
├─────────────────────────────────────────────┤
│                                             │
│  Your usage this week is ~30% higher       │
│  than your typical pattern.                │
│                                             │
│  This could be due to:                     │
│  • More cooking than usual                 │
│  • Guests or events                        │
│  • Appliance issue (rare)                  │
│                                             │
│  [This is expected]  [Something's wrong]   │
│                                             │
└─────────────────────────────────────────────┘
```

##### Feature 5: Sensor Integration (Premium)

**Supported Sensors (Phase 2):**

| Sensor Type | Connection | Price Range | Accuracy |
|-------------|------------|-------------|----------|
| Bluetooth scale | BLE | $15-30 | ±0.1kg |
| WiFi scale | WiFi | $30-50 | ±0.1kg |

**Setup Flow:**
```
┌─────────────────────────────────────────────┐
│  🔌 Connect a Smart Scale                   │
├─────────────────────────────────────────────┤
│                                             │
│  Get real-time tank weight readings!       │
│                                             │
│  Benefits:                                 │
│  ✓ Exact remaining gas (not estimates)    │
│  ✓ More accurate predictions              │
│  ✓ Automatic tracking (no manual input)   │
│                                             │
│  Supported devices:                        │
│  • Xiaomi Smart Scale (recommended)        │
│  • Generic Bluetooth Scales               │
│                                             │
│  [Connect Device]                          │
│                                             │
│  Don't have one?                           │
│  [See recommended scales →]                │
│                                             │
└─────────────────────────────────────────────┘
```

**With Sensor Connected:**
```
┌─────────────────────────────────────────────┐
│  Your Tank (with sensor)                   │
├─────────────────────────────────────────────┤
│                                             │
│  Current weight: 7.2 kg                    │
│  Remaining gas: ~6.0 kg (55%)              │
│  ████████████░░░░░░░░                      │
│                                             │
│  Last reading: 5 mins ago                  │
│  🟢 Sensor connected                       │
│                                             │
│  Based on current usage:                   │
│  ~22 days remaining                        │
│                                             │
└─────────────────────────────────────────────┘
```

##### Feature 6: Data Export (Premium)

**Export Options:**
- PDF report (monthly/yearly summary)
- CSV data (for spreadsheets)
- JSON (for developers/integration)

**Export UI:**
```
┌─────────────────────────────────────────────┐
│  📤 Export Your Data                        │
├─────────────────────────────────────────────┤
│                                             │
│  Date Range:                               │
│  [Last 6 months ▼]                         │
│                                             │
│  Format:                                   │
│  ○ PDF Report (summary with charts)        │
│  ○ CSV (spreadsheet-friendly)              │
│  ○ JSON (raw data)                         │
│                                             │
│  Include:                                  │
│  ☑ Refill history                         │
│  ☑ Usage patterns                         │
│  ☑ Cost data (if tracked)                 │
│  ☐ Include predictions                    │
│                                             │
│  [Export]                                  │
│                                             │
└─────────────────────────────────────────────┘
```

##### Feature 7: Referral Program (Free)

**Referral System:**
```
┌─────────────────────────────────────────────┐
│  🎁 Refer & Earn                            │
├─────────────────────────────────────────────┤
│                                             │
│  Share with friends & family!              │
│                                             │
│  Your referral code: MARIA2026             │
│  Your link: lpgtracker.com/r/MARIA2026     │
│                                             │
│  When they sign up and log first refill:  │
│  • They get: 1 month free premium          │
│  • You get: ₱50 credit                     │
│                                             │
│  ─────────────────────────────────────     │
│  Your Stats                                │
│  Referrals: 3                              │
│  Total earned: ₱150                        │
│  ─────────────────────────────────────     │
│                                             │
│  [Share via SMS] [Share via Facebook]      │
│  [Copy Link]                               │
│                                             │
└─────────────────────────────────────────────┘
```

---

#### Phase 2: Retailer Features

##### Retailer Tier Introduction

| Feature | Free | Standard | Premium |
|---------|------|----------|---------|
| Customer list | ✅ | ✅ | ✅ |
| Order management | ✅ | ✅ | ✅ |
| "Running low" visibility | ✅ | ✅ | ✅ |
| Invite system | ✅ | ✅ | ✅ |
| **Enhanced filters & search** | ❌ | ✅ | ✅ |
| **Analytics dashboard** | ❌ | ✅ Basic | ✅ Full |
| **Customer messaging** | ❌ | ✅ Limited | ✅ Unlimited |
| **Revenue tracking** | ❌ | ✅ | ✅ |
| **Demand forecasting** | ❌ | ❌ | ✅ |
| **Delivery scheduling** | ❌ | ❌ | ✅ |
| **Export reports** | ❌ | ❌ | ✅ |

##### Feature 1: Analytics Dashboard (Standard+)

**Basic Analytics (Standard):**
```
┌─────────────────────────────────────────────┐
│  📊 Business Analytics                      │
├─────────────────────────────────────────────┤
│                                             │
│  This Month Overview                       │
│  ─────────────────────────────────────     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │   52    │  │  +12%   │  │   47    │    │
│  │ Orders  │  │ vs last │  │ Active  │    │
│  │         │  │ month   │  │Customers│    │
│  └─────────┘  └─────────┘  └─────────┘    │
│                                             │
│  Orders This Month                         │
│  ─────────────────────────────────────     │
│  Week 1  ████████████ 15                   │
│  Week 2  ██████████████ 18                 │
│  Week 3  ████████ 12                       │
│  Week 4  ██████ 7 (in progress)            │
│                                             │
│  Customer Breakdown                        │
│  ─────────────────────────────────────     │
│  Home: 38 customers (73%)                  │
│  Business: 14 customers (27%)              │
│                                             │
└─────────────────────────────────────────────┘
```

**Full Analytics (Premium):**
```
┌─────────────────────────────────────────────┐
│  📊 Advanced Analytics                      │
├─────────────────────────────────────────────┤
│                                             │
│  [Overview] [Trends] [Customers] [Revenue] │
│                                             │
│  6-Month Trend                             │
│  ─────────────────────────────────────     │
│      Orders  │  Customers  │  Revenue      │
│  Aug    42   │     35      │   ₱39,000    │
│  Sep    45   │     38      │   ₱41,850    │
│  Oct    48   │     41      │   ₱44,640    │
│  Nov    46   │     43      │   ₱42,780    │
│  Dec    58   │     45      │   ₱53,940    │
│  Jan    52   │     47      │   ₱48,360    │
│                                             │
│  Growth: +24% orders, +34% customers       │
│                                             │
│  Peak Analysis                             │
│  ─────────────────────────────────────     │
│  Busiest day: Saturday (avg 8 orders)     │
│  Busiest time: 8-10 AM                     │
│  Slowest day: Wednesday (avg 3 orders)    │
│                                             │
│  [Export Report]                           │
│                                             │
└─────────────────────────────────────────────┘
```

##### Feature 2: Demand Forecasting (Premium)

**7-Day Forecast:**
```
┌─────────────────────────────────────────────┐
│  📈 Demand Forecast                         │
├─────────────────────────────────────────────┤
│                                             │
│  Next 7 Days                               │
│  ─────────────────────────────────────     │
│  Mon 27  █████ ~5 orders                   │
│  Tue 28  ███ ~3 orders                     │
│  Wed 29  ████ ~4 orders                    │
│  Thu 30  ██████ ~6 orders                  │
│  Fri 31  ████████ ~8 orders (weekend prep) │
│  Sat 01  ██████████ ~10 orders             │
│  Sun 02  ████████ ~8 orders                │
│                                             │
│  Estimated total: ~44 orders               │
│                                             │
│  Stock Recommendation                      │
│  ─────────────────────────────────────     │
│  11kg tanks: 40 units                      │
│  22kg tanks: 10 units                      │
│                                             │
│  ⚠️ Upcoming Large Orders                   │
│  ─────────────────────────────────────     │
│  • Carlo's Restaurant - due ~Tue          │
│  • Ben's Carinderia - due ~Wed            │
│  • Mang Juan's Eatery - due ~Thu          │
│                                             │
└─────────────────────────────────────────────┘
```

**How Forecasting Works:**
- Based on customer cycle patterns
- Considers historical day-of-week trends
- Accounts for known events (holidays)
- Learns from actual vs predicted

##### Feature 3: Customer Messaging (Standard+)

**Messaging Interface:**
```
┌─────────────────────────────────────────────┐
│  💬 Message Customers                       │
├─────────────────────────────────────────────┤
│                                             │
│  Send to:                                  │
│  ○ All customers (47)                      │
│  ○ Running low (8)                         │
│  ○ Haven't ordered in 60+ days (5)        │
│  ○ Business customers only (14)           │
│  ○ Select specific customers...           │
│                                             │
│  Message:                                  │
│  ┌─────────────────────────────────────┐   │
│  │ Hi! Just a reminder that we offer  │   │
│  │ same-day delivery for orders        │   │
│  │ placed before 2 PM. Order through  │   │
│  │ the app for faster service!        │   │
│  └─────────────────────────────────────┘   │
│  Characters: 142/300                       │
│                                             │
│  Send via:                                 │
│  ☑ Push notification                      │
│  ☐ SMS (+₱0.50/message)                   │
│                                             │
│  [Preview]  [Send Now]  [Schedule...]     │
│                                             │
└─────────────────────────────────────────────┘
```

**Messaging Limits:**

| Tier | Push Notifications | SMS |
|------|-------------------|-----|
| Free | ❌ | ❌ |
| Standard | 100/month | Pay per use |
| Premium | Unlimited | 200/month included |

**Pre-built Message Templates:**
- "Running low reminder"
- "Weekend delivery available"
- "Holiday schedule announcement"
- "Price update notification"
- Custom message

##### Feature 4: Revenue Tracking (Standard+)

**Revenue Dashboard:**
```
┌─────────────────────────────────────────────┐
│  💰 Revenue Tracking                        │
├─────────────────────────────────────────────┤
│                                             │
│  January 2026                              │
│  ─────────────────────────────────────     │
│  Total Orders: 52                          │
│  Total Revenue: ₱48,360                    │
│  Average Order: ₱930                       │
│                                             │
│  vs December 2025                          │
│  Orders: -6 (-10%)                         │
│  Revenue: -₱5,580 (-10%)                   │
│  (Normal post-holiday dip)                 │
│                                             │
│  By Tank Size                              │
│  ─────────────────────────────────────     │
│  11kg  │ 45 orders │ ₱40,500 (84%)        │
│  22kg  │  7 orders │  ₱7,860 (16%)        │
│                                             │
│  By Customer Type                          │
│  ─────────────────────────────────────     │
│  Home      │ 38 orders │ ₱34,200 (71%)    │
│  Business  │ 14 orders │ ₱14,160 (29%)    │
│                                             │
│  [Set Prices]  [Export Report]             │
│                                             │
└─────────────────────────────────────────────┘
```

**Price Management:**
```
┌─────────────────────────────────────────────┐
│  💲 Set Your Prices                         │
├─────────────────────────────────────────────┤
│                                             │
│  Current Prices (for revenue calculation)  │
│                                             │
│  11kg tank: [₱ 900    ]                   │
│  22kg tank: [₱ 1,750  ]                   │
│  50kg tank: [₱ 3,800  ]                   │
│                                             │
│  Last updated: Jan 15, 2026               │
│                                             │
│  [Save Changes]                            │
│                                             │
│  Note: These prices are for your tracking │
│  only. Customers don't see these prices.  │
│                                             │
└─────────────────────────────────────────────┘
```

##### Feature 5: Delivery Scheduling (Premium)

**Schedule View:**
```
┌─────────────────────────────────────────────┐
│  🚚 Delivery Schedule                       │
├─────────────────────────────────────────────┤
│                                             │
│  [Today] [Tomorrow] [This Week]            │
│                                             │
│  Today - 8 Deliveries                      │
│  ─────────────────────────────────────     │
│                                             │
│  Morning (6 deliveries)                    │
│  ┌─────────────────────────────────────┐   │
│  │ ☐ 8:00  Maria Santos               │   │
│  │         45 Rizal St, Brgy. 123     │   │
│  │         11kg • Home                 │   │
│  ├─────────────────────────────────────┤   │
│  │ ☐ 8:30  Juan Dela Cruz             │   │
│  │         78 Mabini St, Brgy. 123    │   │
│  │         11kg • Home                 │   │
│  ├─────────────────────────────────────┤   │
│  │ ☐ 9:00  Ana's Carinderia           │   │
│  │         12 Luna St, Brgy. 456      │   │
│  │         22kg • Business             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Afternoon (2 deliveries)                  │
│  ┌─────────────────────────────────────┐   │
│  │ ☐ 2:00  Carlo's Restaurant         │   │
│  │         99 Main St, Brgy. 789      │   │
│  │         2x 22kg • Business          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Add Delivery]  [Optimize Route]         │
│  [Print List]    [Export]                 │
│                                             │
└─────────────────────────────────────────────┘
```

**Route Optimization:**
```
┌─────────────────────────────────────────────┐
│  🗺️ Optimized Route                         │
├─────────────────────────────────────────────┤
│                                             │
│  Suggested delivery order:                 │
│                                             │
│  1. Start: Your Location                   │
│     ↓ 0.5 km                               │
│  2. Maria Santos (Brgy. 123)              │
│     ↓ 0.3 km                               │
│  3. Juan Dela Cruz (Brgy. 123)            │
│     ↓ 1.2 km                               │
│  4. Ana's Carinderia (Brgy. 456)          │
│     ↓ 0.8 km                               │
│  5. ...                                    │
│                                             │
│  Total distance: ~8.5 km                   │
│  Estimated time: ~45 mins                  │
│                                             │
│  [Open in Google Maps]  [Open in Waze]    │
│                                             │
└─────────────────────────────────────────────┘
```

---

#### Phase 2: Platform Features

##### Multi-Retailer Support (Customer)

Phase 2 allows customers to have multiple retailers:

| Setting | Description |
|---------|-------------|
| Primary retailer | Default for all orders |
| Secondary retailer | Backup option |

**Use Cases:**
- Primary retailer unavailable → order from secondary
- Different retailers for different locations
- Compare service quality

**Customer View:**
```
┌─────────────────────────────────────────────┐
│  🏪 Your Retailers                          │
├─────────────────────────────────────────────┤
│                                             │
│  ⭐ Primary: Mang Pedro's LPG              │
│     Orders go here by default              │
│     [View] [Change Primary]                │
│                                             │
│  Secondary: Juan's Gas Supply              │
│     Backup option                          │
│     [View] [Remove]                        │
│                                             │
│  [+ Add Another Retailer]                  │
│                                             │
└─────────────────────────────────────────────┘
```

##### Payment Integration (Optional)

Allow in-app payments (optional for both retailer and customer):

**Supported Methods (Philippines):**
- GCash
- Maya (PayMaya)
- Credit/Debit card
- Bank transfer

**Customer Checkout:**
```
┌─────────────────────────────────────────────┐
│  💳 Payment Options                         │
├─────────────────────────────────────────────┤
│                                             │
│  Order Total: ₱950                         │
│                                             │
│  Pay now:                                  │
│  ○ GCash                                   │
│  ○ Maya                                    │
│  ○ Credit/Debit Card                       │
│                                             │
│  Or pay later:                             │
│  ○ Cash on Delivery                        │
│                                             │
│  [Continue]                                │
│                                             │
│  Note: Your retailer accepts these         │
│  payment methods.                          │
│                                             │
└─────────────────────────────────────────────┘
```

**Important:** Cash on delivery remains default. In-app payment is optional enhancement.

---

#### Phase 2 Pricing Structure

##### Consumer Pricing

| Tier | Home | Small Business |
|------|------|----------------|
| **Free** | $0 | $0 |
| **Premium** | $2-3/month (₱100-150) | $15-25/month (₱750-1,250) |
| **Annual** (20% discount) | ~$20/year (₱1,000) | ~$150/year (₱7,500) |

##### Retailer Pricing

| Tier | Features | Monthly Price |
|------|----------|---------------|
| **Free** | Basic (Phase 1 features) | $0 |
| **Standard** | Analytics + Messaging + Revenue | $30-50 (₱1,500-2,500) |
| **Premium** | All features + Forecasting | $75-100 (₱3,750-5,000) |

##### Free Trial Strategy

| User Type | Trial Offer |
|-----------|-------------|
| Consumer (new) | 14-day premium trial |
| Consumer (referral) | 1-month free premium |
| Retailer (new) | 30-day Standard trial |
| Retailer (high-volume) | 60-day Premium trial |

---

#### Phase 2 Feature Summary

##### Consumer Features

| Feature | Free | Premium | Priority |
|---------|------|---------|----------|
| Abnormal usage alerts | ✅ | ✅ | P0 |
| Referral program | ✅ | ✅ | P1 |
| Multi-tank support | ❌ | ✅ | P0 |
| Usage analytics | ❌ | ✅ | P0 |
| Cost tracking | ❌ | ✅ | P1 |
| Historical trends | ❌ | ✅ | P1 |
| Data export | ❌ | ✅ | P2 |
| Sensor integration | ❌ | ✅ | P2 |

##### Retailer Features

| Feature | Free | Standard | Premium | Priority |
|---------|------|----------|---------|----------|
| Enhanced customer list | ❌ | ✅ | ✅ | P0 |
| Basic analytics | ❌ | ✅ | ✅ | P0 |
| Advanced analytics | ❌ | ❌ | ✅ | P1 |
| Customer messaging | ❌ | ✅ Limited | ✅ Unlimited | P0 |
| Revenue tracking | ❌ | ✅ | ✅ | P1 |
| Demand forecasting | ❌ | ❌ | ✅ | P1 |
| Delivery scheduling | ❌ | ❌ | ✅ | P2 |
| Report export | ❌ | ❌ | ✅ | P2 |

---

#### Phase 1 → Phase 2 Transition Criteria

| Criteria | Threshold | Rationale |
|----------|-----------|-----------|
| Active users | ≥5,000 | Enough base to monetize |
| Active retailers | ≥10 | Distribution network established |
| Refill cycles completed | ≥3 per user average | History data available |
| Prediction accuracy | ≤±20% | Model is reliable |
| User retention (30-day) | ≥35% | Users find value |
| Positive feedback | ≥70% "accurate" ratings | Trust established |

**Only launch premium features when:**
1. Free features are stable and trusted
2. Enough users to test conversion
3. Clear value differentiation exists

---

### Phase 3: Platform Features (18-30 months)

#### Phase 3 Goals

| Goal | Description |
|------|-------------|
| **Scale** | National coverage, international expansion |
| **Platform** | Become infrastructure for LPG ecosystem |
| **Enterprise** | Serve larger retailers and distributors |
| **Intelligence** | Advanced AI/ML for predictions |

#### Phase 3 Feature Overview

| Feature | User Type | Priority |
|---------|-----------|----------|
| Multi-location management | SMBs | P0 |
| Enterprise retailer dashboard | Large Retailers | P0 |
| API for third-party integration | Retailers/Partners | P1 |
| Hardware partner integrations | All | P1 |
| Advanced AI predictions | All | P1 |
| White-label option | Enterprise Retailers | P2 |
| B2B marketplace (optional) | Retailers | P2 |
| Multi-country support | All | P0 |

#### Phase 3 Details (To Be Expanded)

Phase 3 documentation will be developed as Phase 2 progresses, based on:
- Learnings from Phase 1 and 2
- Market feedback
- Competitive landscape changes
- Technology advancements

---

## 8. User Experience & App Flow

### High-Level Flow
```
Splash Screen
     ↓
Quick Status Dashboard (Home)
     ↓
Usage Details / Order / Alerts
     ↓
Account & Support
```

### First-Time User Flow (Onboarding)

1. **Splash/Welcome**
   - Logo
   - Tagline: "Never run out of gas again"

2. **Onboarding (3 screens max)**
   - Track Your Usage
   - Get Refill Alerts
   - Order LPG in One Tap
   - → "Get Started"

3. **Setup (Minimal)**
   - Select LPG type/tank size
   - Select usage type (Home/Business)
   - Allow notifications
   - → Straight to Home Dashboard

### Home Dashboard (Most Important Screen)

**Design Principle:** Answer one question in 3 seconds: "Do I need to worry about my gas today?"

**Layout:**
```
┌─────────────────────────────────┐
│  TOP: LPG Level Gauge           │
│  "68% Remaining"                │
│  "≈ 25 days remaining"          │
├─────────────────────────────────┤
│  MIDDLE: Usage Summary          │
│  Simple line graph              │
│  Today / This Week toggle       │
├─────────────────────────────────┤
│  ACTION BUTTONS (Big & Obvious) │
│  [Order Refill] [View Usage]    │
│  [Safety Alerts]                │
├─────────────────────────────────┤
│  BOTTOM: Status Info            │
│  Next expected refill date      │
│  Last delivery info             │
└─────────────────────────────────┘
```

### Navigation Structure
**Bottom Navigation (Recommended)**
```
Home | Usage | Order | Alerts | Account
```

### Alert Types

| Alert | Trigger | Message Example |
|-------|---------|-----------------|
| Low LPG | ≤5 days remaining | "You may run out in 4 days. Order now." |
| Abnormal Usage | >130% of average | "Usage today is higher than usual." |
| Forgotten Reset | Est. LPG ≤ 0, no refill logged | "Have you replaced your LPG tank?" |

### UX Principles
- Visual over text (gauges, colors)
- Predictive over reactive (warn before empty)
- One-tap actions
- Trust & safety visible everywhere
- No complex settings up front
- No hidden refill buttons

---

## 9. Business Model & Pricing Strategy

### Revenue Streams

| Stream | Segment | Phase | Model |
|--------|---------|-------|-------|
| Premium Subscriptions | Households | Phase 2+ | $1-3/month |
| Analytics Subscriptions | SMBs | Phase 1+ | $10-30/month |
| SaaS Platform | Retailers | Phase 2+ | $40-100/month |
| Data Insights | Partners | Phase 3+ | Custom pricing |

### Pricing Tiers

#### Households
| Tier | Features | Price (USD) | Price (PHP) |
|------|----------|-------------|-------------|
| Free | Basic alerts, single tank, manual input | $0 | ₱0 |
| Premium | Multi-tank, advanced alerts, historical trends | $1-3/month | ₱50-150/month |

#### SMB / Businesses
| Tier | Features | Price (USD) | Price (PHP) |
|------|----------|-------------|-------------|
| Free | Basic tracking, alerts only | $0 | ₱0 |
| Premium | Analytics, cost optimization, multi-tank dashboard | $10-30/month | ₱500-1,500/month |

#### Retailers / Distributors
| Tier | Features | Price (USD) | Price (PHP) |
|------|----------|-------------|-------------|
| Pilot | Basic customer list, order notifications | Free (Phase 1) | Free |
| Standard | Usage dashboard, customer analytics | $40-100/month | ₱2,000-5,000/month |
| Enterprise | Full analytics, API access, custom integrations | Custom | Custom |

### Revenue Projections — Scenario Analysis

#### Phase 1 Scenarios (Month 6-9)

| Scenario | Households | SMBs | SMB Upgrade Rate | Monthly Revenue |
|----------|------------|------|------------------|-----------------|
| **Conservative** | 5,000 | 200 | 15% | $3,600 |
| **Moderate** | 15,000 | 500 | 25% | $12,500 |
| **Optimistic** | 50,000 | 1,500 | 35% | $52,500 |

*Assumptions: Households free, SMB premium = $20/month average*

#### Phase 2 Scenarios (Month 12-18)

| Scenario | Households | HH Upgrade | SMBs | SMB Upgrade | Retailers | Monthly Revenue |
|----------|------------|------------|------|-------------|-----------|-----------------|
| **Conservative** | 30,000 | 3% | 1,000 | 20% | 10 | $6,700 |
| **Moderate** | 75,000 | 5% | 3,000 | 30% | 30 | $27,750 |
| **Optimistic** | 150,000 | 8% | 8,000 | 40% | 75 | $92,500 |

*Assumptions: HH premium = $2/month, SMB premium = $20/month, Retailer = $50/month*

#### Phase 3 Scenarios (Month 24-30, Regional/National)

| Scenario | Households | HH Upgrade | SMBs | SMB Upgrade | Retailers | Monthly Revenue |
|----------|------------|------------|------|-------------|-----------|-----------------|
| **Conservative** | 200,000 | 5% | 10,000 | 25% | 100 | $75,000 |
| **Moderate** | 500,000 | 8% | 25,000 | 35% | 300 | $275,000 |
| **Optimistic** | 1,000,000 | 10% | 50,000 | 45% | 750 | $697,500 |

#### Key Assumptions & Sensitivity

| Variable | Conservative | Moderate | Optimistic | Industry Benchmark |
|----------|--------------|----------|------------|-------------------|
| Household Premium Conversion | 3% | 5-8% | 10% | Freemium apps: 2-5% |
| SMB Premium Conversion | 15-20% | 25-35% | 40-45% | B2B SaaS: 10-30% |
| Monthly Churn (Households) | 8% | 5% | 3% | Consumer apps: 5-10% |
| Monthly Churn (SMBs) | 5% | 3% | 2% | B2B SaaS: 2-5% |

### Customer Acquisition Cost (CAC) Analysis

#### CAC by Channel

| Channel | Cost Components | Est. CAC (Household) | Est. CAC (SMB) |
|---------|-----------------|---------------------|----------------|
| **Retailer Distribution** | Onboarding time, training, materials | $0.50-1.00 | $2-5 |
| **Digital Marketing** | Ads, content, social | $2-5 | $15-30 |
| **Referral Program** | Incentives | $1-2 | $5-10 |
| **Direct Sales** | Sales team time | N/A | $50-100 |

#### Retailer Onboarding Cost

| Cost Item | One-Time | Recurring (Monthly) |
|-----------|----------|---------------------|
| Sales/BD time (per retailer) | $100-200 | — |
| Training materials | $20-50 | — |
| Integration support | $50-100 | — |
| Ongoing support | — | $20-50 |
| **Total per Retailer** | **$170-350** | **$20-50** |

#### CAC vs LTV Analysis

| Segment | CAC | Monthly Revenue | Avg. Lifespan | LTV | LTV:CAC Ratio |
|---------|-----|-----------------|---------------|-----|---------------|
| Household (Free) | $0.75 | $0 | — | $0 | N/A (funnel) |
| Household (Premium) | $0.75 | $2 | 12 months | $24 | 32:1 |
| SMB (Premium) | $10 | $20 | 18 months | $360 | 36:1 |
| Retailer (SaaS) | $250 | $50 | 24 months | $1,200 | 4.8:1 |

**Target LTV:CAC Ratio:** >3:1 for sustainable growth

---

## 10. Go-to-Market Strategy

### Distribution Model: Retailer-Led (B2B2C)

```
Retailer onboards
      ↓
Retailer distributes app to customers (free)
      ↓
Customers build usage habit
      ↓
Optional premium upgrades
      ↓
Retailer subscribes for analytics
```

### Why Retailer-Led Works
- Retailers already have customer trust
- Zero switching friction for users
- No cold-start marketplace problem
- You control rollout quality
- Retailers see it as retention tool, not threat

### Retailer Incentive Program

#### Phase 1 Incentives (Pilot)

| Incentive | Description | Value |
|-----------|-------------|-------|
| **Free Analytics Access** | Dashboard showing customer reorder patterns | Worth $50/month |
| **Priority Support** | Dedicated onboarding and support | High-touch service |
| **Co-Branding** | "Powered by [Retailer Name]" in app | Brand visibility |
| **Early Feature Access** | Beta features before general release | Competitive edge |

#### Phase 2 Incentives (Growth)

| Incentive | Description | Value |
|-----------|-------------|-------|
| **Revenue Share** | 10-15% of premium upgrades from their customers | Variable |
| **Tiered Pricing** | Discounts based on active users | Up to 30% off SaaS |
| **Lead Generation** | New customer referrals from app | Growth driver |
| **Marketing Support** | Co-marketing materials, case studies | Brand building |

#### Phase 3 Incentives (Scale)

| Incentive | Description | Value |
|-----------|-------------|-------|
| **White-Label Option** | Retailer-branded version of app | Premium tier |
| **API Access** | Integration with retailer systems | Operational efficiency |
| **Exclusive Territory** | First-mover advantage in new regions | Market protection |

### Retailer Value Proposition
- "A free LPG usage & reorder assistant for your customers"
- Retention tool — customers less likely to switch
- Operations smoother — predictable demand forecasting
- Professional upgrade — modernize their service

### Fallback Distribution Strategy

If retailer adoption is slow:

| Fallback | Trigger | Action |
|----------|---------|--------|
| **Direct Consumer Marketing** | <3 retailers after 3 months | Facebook/Google ads targeting LPG users |
| **Partnership with LPG Brands** | Retailer resistance | Approach Petron, Shell, etc. |
| **B2B Direct Sales** | SMB interest without retailer | Direct outreach to restaurants |
| **Influencer/Community** | Low awareness | Partner with cooking/food influencers |

### Phase 1 Launch Checklist
- [ ] Identify 1-2 friendly local retailers
- [ ] Onboard retailers with pilot agreement
- [ ] Let retailers distribute to:
  - Households (free, alerts-only)
  - SMBs (free basic tier)
- [ ] Track usage, alert responses, reorder timing
- [ ] Gather feedback for accuracy refinement

### What NOT to Do Early
- No supplier comparison
- No price competition
- No forced exclusivity
- No marketplace framing
- No aggressive monetization

---

## 11. Global Expansion Strategy

### Global LPG Market Reality
- Global LPG consumption: ~300 million metric tons/year
- Market value: $360B-$450B/year
- Most markets are **under-digitized** for usage tracking

### LPG Models by Region

| Region | LPG Model | Digitization | Opportunity |
|--------|-----------|--------------|-------------|
| Philippines, SEA | Cylinder exchange | Low | HIGH |
| Indonesia | Cylinder exchange | Low | HIGH |
| India | Cylinder exchange (govt-led) | Low | HIGH (scale) |
| Latin America | Cylinder exchange/delivery | Low | HIGH |
| Africa | Cylinder refill | Very Low | MEDIUM |
| Europe | Bulk tank, scheduled | Medium | MEDIUM |
| USA | Propane tanks, scheduled | Medium | MEDIUM (SMB focus) |

### Best-Fit LPG Models for This App

| Model | Fit Rating | Notes |
|-------|------------|-------|
| Cylinder Exchange | ★★★★★ | Perfect fit, largest market |
| Cylinder Refill | ★★★★☆ | Minor adaptations needed |
| Bulk Tank/Scheduled | ★★★☆☆ | Analytics play, not reorder-driven |
| Smart/Metered | ★★☆☆☆ | Already tracked, limited value-add |

### Country-Agnostic Core Design

**Principle:** Separate LPG logic from local rules

**Universal Core (Never Changes):**
- User, Location, Tank entities
- Consumption estimation engine
- Alert logic
- User intent flow

**Configurable Adapters (Per Region):**
- Tank sizes and models
- Currency and pricing
- Refill vs exchange rules
- Delivery models
- Compliance requirements

### Architecture Mental Model
```
[ Core Engine ]
├── Usage Estimation
├── Alert Logic
├── History
├── User Habits
└── Analytics

[ Regional Adapters ]
├── Tank Models
├── Pricing Rules
├── Delivery Types
├── Compliance
└── Retailer Integration
```

### Network Effects & Growth Mechanism

#### How Growth Compounds

Unlike social apps, this is a **utility app** — network effects require explicit mechanisms:

| Mechanism | Description | Expected Impact |
|-----------|-------------|-----------------|
| **Retailer Network Effect** | More users → more retailers want to join → more users | Medium-High |
| **Referral Program** | Users refer friends/family using same retailer | Medium |
| **SMB Staff Adoption** | Restaurant staff use app at home too | Low-Medium |
| **Word of Mouth** | "How do you know when to reorder?" conversations | Low-Medium |
| **Retailer Competition** | Retailers without app lose customers to those with app | High (Phase 2+) |

#### Growth Flywheel

```
Retailer joins
      ↓
Distributes to customers → Users build habit
      ↓
Demand visibility improves → Retailer sees value
      ↓
Retailer promotes more actively → More users
      ↓
Other retailers notice → New retailers join
      ↓
(Cycle repeats)
```

#### Virality Coefficient Assumptions

| Phase | K-Factor Target | Mechanism |
|-------|-----------------|-----------|
| Phase 1 | 0.3-0.5 | Retailer distribution only |
| Phase 2 | 0.5-0.8 | + Referral program |
| Phase 3 | 0.8-1.2 | + Retailer competition + organic |

*K-Factor >1.0 = viral growth (each user brings >1 new user)*

### Geographic Expansion Timeline

| Phase | Geography | Focus |
|-------|-----------|-------|
| Phase 1 | City/Local | Validate behavior |
| Phase 2 | Metro/Province | Regional expansion |
| Phase 3 | Nationwide | Full country coverage |
| Phase 4+ | SEA → LatAm → India | International |

---

## 12. Technical Architecture

### Core Entities

```
User
├── user_id
├── name
├── contact
├── created_at
├── region
└── locations[]

Location
├── location_id
├── address
├── type (home/business)
├── timezone
└── tanks[]

Tank
├── tank_id
├── capacity
├── unit (kg/liters)
├── model (exchange/refill/bulk)
├── current_level
├── last_refill_date
├── retailer_id
└── sensor_id (optional)

ReorderEvent
├── event_id
├── tank_id
├── order_date
├── delivery_date
├── quantity
└── status

AccuracyLog
├── log_id
├── tank_id
├── predicted_empty_date
├── actual_refill_date
├── error_days
└── user_feedback
```

### API Endpoints (Conceptual)

```
POST   /users                    # Create user
GET    /users/{id}               # Get user profile
POST   /tanks                    # Register tank
PUT    /tanks/{id}               # Update tank (manual input)
POST   /tanks/{id}/refill        # Log refill
GET    /tanks/{id}/prediction    # Get usage prediction
POST   /orders                   # Create reorder request
GET    /alerts                   # Get active alerts
POST   /feedback                 # Log accuracy feedback
GET    /analytics/usage          # Usage analytics (premium)
```

### Technology Considerations
- **Mobile:** React Native (cross-platform)
- **Backend:** Node.js or Python (FastAPI)
- **Database:** PostgreSQL (relational, scalable)
- **Notifications:** Firebase Cloud Messaging
- **Analytics:** Mixpanel or Amplitude
- **Future:** Bluetooth SDK for sensor integration

### Offline Support Strategy

| Feature | Offline Capability | Sync Strategy |
|---------|-------------------|---------------|
| View current level | Yes (cached) | Sync on reconnect |
| Manual input | Yes (queued) | Sync on reconnect |
| Alerts | Yes (local calculation) | Refresh on reconnect |
| Order request | Queued | Submit on reconnect |
| Analytics | No | Requires connection |

---

## 13. Roadmap & Phases

### Phase 1: Local MVP & Feasibility (0-9 months)

**Focus:** Validate household and SMB behavior with actual LPG usage

**Key Activities:**
- Onboard 1-2 trusted local retailers
- Distribute free app to households and SMBs
- Track tank usage, alert responses, reorder timing
- Gather feedback for predictive engine accuracy

**Geography:** City / Immediate region

**Monetization:** Minimal (learning phase)

**Key Deliverables:**
- [ ] Working mobile app (iOS/Android)
- [ ] Basic usage estimation engine
- [ ] Alert system
- [ ] Retailer pilot dashboard
- [ ] Feedback collection mechanism
- [ ] Accuracy tracking system

**Team Required:** 2-3 people (see Section 19)

**Budget Estimate:** $15,000-30,000

#### Phase 1 Decision Gates

| Gate | Timing | Go Criteria | No-Go Action |
|------|--------|-------------|--------------|
| **G1: Technical** | Month 3 | App functional, <5% crash rate | Fix or pivot tech stack |
| **G2: Retailer** | Month 4 | ≥1 retailer actively distributing | Revisit value prop or try direct |
| **G3: User Adoption** | Month 6 | ≥500 active users | Reassess product-market fit |
| **G4: Accuracy** | Month 6 | ≤±30% prediction error | Add manual input emphasis |
| **G5: Behavior** | Month 9 | ≥15% early reorders | Pivot or extend Phase 1 |

### Phase 2: Regional Expansion & Monetization (9-18 months)

**Focus:** Validate premium upgrade interest, refine engine, start revenue

**Key Activities:**
- Expand to multiple cities/provinces
- Launch tiered subscriptions (SMB analytics)
- Introduce premium household features
- Test retailer SaaS features

**Geography:** Metro / Province wide

**Monetization:** SMB upgrades, optional household premium

**Key Deliverables:**
- [ ] Premium SMB dashboard
- [ ] Multi-tank support
- [ ] Retailer analytics dashboard
- [ ] Improved prediction accuracy
- [ ] Payment integration
- [ ] Referral program

**Team Required:** 4-6 people

**Budget Estimate:** $50,000-100,000

#### Phase 2 Decision Gates

| Gate | Timing | Go Criteria | No-Go Action |
|------|--------|-------------|--------------|
| **G6: Revenue** | Month 12 | ≥$5,000 MRR | Adjust pricing or features |
| **G7: Retention** | Month 12 | ≥40% 30-day retention | Improve engagement |
| **G8: SMB Conversion** | Month 15 | ≥15% upgrade rate | Revisit premium value |
| **G9: Retailer SaaS** | Month 18 | ≥5 paying retailers | Adjust retailer offering |

### Phase 3: National/Global Scaling (18-30 months)

**Focus:** Global-ready core, full SaaS rollout, network expansion

**Key Activities:**
- Roll out country-agnostic core
- Aggressive retailer onboarding
- Launch premium features globally
- Begin strategic partnerships

**Geography:** Nationwide → SEA/LatAm → Other regions

**Monetization:** Full tiered subscriptions (all segments)

**Key Deliverables:**
- [ ] Multi-currency support
- [ ] Regional configuration system
- [ ] Enterprise retailer features
- [ ] Partner API
- [ ] Hardware integration SDK
- [ ] Localization (languages)

**Team Required:** 8-12 people

**Budget Estimate:** $200,000-500,000

#### Phase 3 Decision Gates

| Gate | Timing | Go Criteria | No-Go Action |
|------|--------|-------------|--------------|
| **G10: Scale** | Month 24 | ≥50,000 active users | Focus on retention |
| **G11: Revenue** | Month 24 | ≥$50,000 MRR | Optimize monetization |
| **G12: Global Ready** | Month 30 | Config system tested | Delay international |

### Visual Timeline

```
Month:  0   3   6   9   12  15  18  21  24  27  30
        |---|---|---|---|---|---|---|---|---|---|
Phase 1 |===========|
        MVP & Feasibility
        G1  G2  G3/G4   G5

Phase 2             |===============|
                    Regional & Revenue
                    G6      G7  G8      G9

Phase 3                             |===============|
                                    National/Global Scale
                                    G10     G11         G12
```

### Timeline Buffer & Contingencies

| Risk | Buffer Added | Contingency |
|------|--------------|-------------|
| Technical delays | +2 months to Phase 1 | Reduce scope, not quality |
| Slow retailer adoption | +3 months to Phase 1 | Try direct marketing |
| Low conversion rates | +3 months to Phase 2 | A/B test pricing/features |
| Accuracy issues | +2 months to Phase 1 | Prioritize sensor integration |

---

## 14. Success Metrics & KPIs

### Phase 1 KPIs

| Metric | Target | Minimum | Measurement | Frequency |
|--------|--------|---------|-------------|-----------|
| Daily Active Users (DAU) | 500+ | 200 | App analytics | Daily |
| Weekly Active Users (WAU) | 2,000+ | 800 | App analytics | Weekly |
| Alert Response Rate | >60% | >40% | User actions after alert | Weekly |
| Prediction Accuracy | ±25% | ±35% | Refill date comparison | Monthly |
| Early Reorder Adoption | >20% | >10% | Orders before Day 0 | Monthly |
| Retailer Satisfaction | >4/5 | >3.5/5 | Survey | Monthly |
| App Crash Rate | <2% | <5% | Crashlytics | Daily |

### Phase 2 KPIs

| Metric | Target | Minimum | Measurement | Frequency |
|--------|--------|---------|-------------|-----------|
| Total Users | 50,000+ | 20,000 | App analytics | Monthly |
| SMB Upgrade Rate | >25% | >15% | Conversions | Monthly |
| Household Upgrade Rate | >5% | >2% | Conversions | Monthly |
| User Retention (7-day) | >60% | >45% | Cohort analysis | Weekly |
| User Retention (30-day) | >40% | >25% | Cohort analysis | Monthly |
| Prediction Accuracy | ±15% | ±25% | Refined model | Monthly |
| MRR (Monthly Recurring Revenue) | >$20,000 | >$5,000 | Financial | Monthly |
| NPS (Net Promoter Score) | >40 | >20 | Survey | Quarterly |

### Phase 3 KPIs

| Metric | Target | Minimum | Measurement | Frequency |
|--------|--------|---------|-------------|-----------|
| Total Users | 500,000+ | 200,000 | App analytics | Monthly |
| Premium Conversion (HH) | >8% | >5% | Conversions | Monthly |
| Premium Conversion (SMB) | >35% | >25% | Conversions | Monthly |
| Retailer Subscriptions | 100+ | 50 | Sales | Monthly |
| MRR | >$200,000 | >$75,000 | Financial | Monthly |
| Geographic Coverage | 3+ countries | 1 country | Operations | Quarterly |
| Churn Rate (Monthly) | <5% | <8% | Cohort analysis | Monthly |

### Kill Criteria (Expanded)

| Criteria | Threshold | Timeline | Action |
|----------|-----------|----------|--------|
| App reorder rate | <10% | After 9 months | Reassess core value proposition |
| Weekly retention | <20% | After 6 months | Major UX overhaul or pivot |
| Retailer adoption | 0 active after pilot | After 6 months | Switch to direct distribution |
| Retailer churn | >50% | After 12 months | Reassess retailer value prop |
| Prediction accuracy | >±45% error | After 6 months | Prioritize manual input / sensors |
| SMB conversion | <5% | After 12 months | Revisit premium features/pricing |
| Monthly burn vs revenue | Revenue <10% of burn | After 18 months | Cut costs or raise funding |
| User NPS | <0 | After 12 months | Major product reassessment |

### Metric Dashboard (Recommended)

Track these metrics in a single dashboard:
1. **Health:** DAU, WAU, MAU, Retention curves
2. **Engagement:** Alert response rate, reorder rate, session frequency
3. **Accuracy:** Prediction error distribution, user feedback scores
4. **Revenue:** MRR, conversion rates, ARPU, churn
5. **Growth:** New users, referrals, retailer count

---

## 15. Risks & Mitigations

### Product Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Estimation inaccuracy | Users lose trust | Medium | Allow manual override, collect feedback, iterate |
| Low alert response | No behavior change | Medium | Optimize alert timing, test messaging |
| Feature creep | Delayed MVP | High | Strict scope discipline, phase gates |
| Poor offline experience | User frustration | Medium | Implement robust caching and sync |

### Market Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Retailer apathy | No distribution | Medium | Strong pilot relationships, demonstrate value early, have fallback |
| Competitor entry | Market share loss | Low-Medium | Focus on user habit ownership, not features |
| Regulation changes | Compliance issues | Low | Monitor regulatory environment, build compliance into core |
| Economic downturn | Reduced spending | Low | Keep free tier valuable, focus on cost-saving messaging |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Low premium conversion | No revenue | Medium | Validate willingness to pay early, A/B test pricing |
| Retailer conflict | Loss of distribution | Low | Maintain neutrality, no price competition |
| Gaming/abuse | Revenue leakage | Medium | Cap benefits, accept small leakage (see below) |
| Funding gap | Development stops | Medium | Bootstrap Phase 1, seek funding for Phase 2 |

### Gaming & Abuse Strategy

**Scenario:** Households with reserve tanks gaming early-order benefits

**Strategic Stance:** Accept small leakage, don't police heavily

**Quantified Acceptable Leakage:**

| Metric | Acceptable Threshold | Action Trigger |
|--------|---------------------|----------------|
| % of users suspected gaming | <15% | Monitor only |
| % of users suspected gaming | 15-25% | Tighten benefit rules |
| % of users suspected gaming | >25% | Major policy review |
| Revenue leakage from gaming | <$500/month (Phase 1) | Acceptable |
| Revenue leakage from gaming | <5% of incentive budget | Acceptable |
| Revenue leakage from gaming | >10% of incentive budget | Policy change |

**Detection Signals (Silent, Backend Only):**
- Abnormally short reorder cycles (<50% of profile average)
- Frequent "early" orders without usage pattern support
- Multiple tanks registered but irregular patterns

**Response Tiers:**

| Tier | Signal Strength | Action |
|------|-----------------|--------|
| **Tier 1** | Mild suspicion | No action, continue monitoring |
| **Tier 2** | Moderate pattern | Silently reduce early benefit |
| **Tier 3** | Strong pattern | Remove early benefit for cycle |
| **Never** | Any | Confront user, block account, penalize |

**Rationale:**
- Cost of policing > cost of abuse
- Trust loss > small discount leakage
- Phase 1 is about habit formation, not revenue protection
- Confrontation causes churn and negative word-of-mouth

---

## 16. Competitive Landscape

### Direct Competitors

| Competitor | Market | Focus | Strengths | Weaknesses | Threat Level |
|------------|--------|-------|-----------|------------|--------------|
| **Gaslink (PH)** | Philippines | B2B LPG ordering | Established relationships | Enterprise-focused, not user-centric | Medium |
| **LPG Tracker apps** | Global | Basic tracking | Simple, free | No prediction, no retailer integration | Low |
| **IoT LPG monitors** | Global | Hardware sensors | Accurate data | Expensive, complex setup | Low-Medium |
| **Supplier apps** | Various | Own-brand ordering | Captive customers | Single supplier lock-in | Medium |

### Indirect Competitors

| Competitor Type | Examples | Overlap | Differentiation |
|-----------------|----------|---------|-----------------|
| **Gas utility apps** | Meralco, Manila Water apps | Consumption tracking | Different fuel type, no LPG expertise |
| **Smart home platforms** | Google Home, Alexa | IoT integration | General purpose, not LPG-specific |
| **Delivery apps** | Grab, Lalamove | Last-mile delivery | No usage tracking, no prediction |

### Competitive Advantages

| Advantage | Description | Defensibility |
|-----------|-------------|---------------|
| **Usage-first approach** | Focus on user behavior, not transactions | Medium (can be copied) |
| **Retailer-neutral positioning** | Not tied to single supplier | High (trust-based) |
| **No hardware requirement** | Low barrier to entry | Medium (until competitors simplify) |
| **Local market knowledge** | Philippine LPG ecosystem understanding | High (experience-based) |
| **Habit ownership** | Users trust app over retailer for timing | High (sticky) |

### Competitive Response Strategy

| Scenario | Response |
|----------|----------|
| **Well-funded startup enters** | Accelerate retailer partnerships, lock in relationships |
| **Major LPG brand launches app** | Position as neutral alternative, emphasize independence |
| **IoT costs drop significantly** | Integrate sensors as optional upgrade |
| **Delivery app adds LPG** | Focus on prediction/analytics (they do delivery, we do intelligence) |

### Market Positioning Map

```
                    User-Centric
                         ↑
                         |
    [This App] ←─────────┼─────────→ [Supplier Apps]
         ●               |               ●
                         |
   Prediction-           |          Transaction-
   Focused               |          Focused
                         |
                         |
         ●               |               ●
    [IoT Monitors]       |          [Delivery Apps]
                         |
                         ↓
                  Supplier-Centric
```

---

## 17. Regulatory & Compliance

### Philippines Regulatory Landscape

#### Data Privacy Act (RA 10173)

| Requirement | Application | Implementation |
|-------------|-------------|----------------|
| **Consent** | Collect user consent for data processing | In-app consent flow during onboarding |
| **Purpose Limitation** | Use data only for stated purposes | Clear privacy policy, no data selling |
| **Data Security** | Protect personal information | Encryption, secure servers, access controls |
| **Breach Notification** | Report breaches within 72 hours | Incident response plan |
| **Data Subject Rights** | Allow access, correction, deletion | Account settings, support process |
| **Registration** | Register with NPC if processing sensitive data | Assess if required, register if needed |

#### LPG Industry Regulations (DOE)

| Regulation | Relevance | Compliance Approach |
|------------|-----------|---------------------|
| **Retail licensing** | App doesn't sell LPG directly | Not applicable (info service only) |
| **Price monitoring** | May display prices | Show retailer-provided prices only |
| **Safety standards** | Safety tips in app | Partner with DOE for content |
| **Consumer protection** | Fair practices | Transparent terms, no misleading claims |

### Global Expansion Compliance

#### By Region

| Region | Key Regulation | Primary Concern | Approach |
|--------|----------------|-----------------|----------|
| **EU** | GDPR | Consent, data portability, right to deletion | Build GDPR-compliant from start |
| **India** | DPDP Act 2023 | Consent, data localization | Local data storage option |
| **Indonesia** | PDP Law | Similar to GDPR | Same GDPR approach |
| **USA** | CCPA (California), state laws | Opt-out rights, disclosure | Privacy settings, clear policy |
| **Latin America** | LGPD (Brazil), various | GDPR-like requirements | Same GDPR approach |

### Compliance Checklist

#### Phase 1 (Must Have)
- [ ] Privacy policy (clear, readable)
- [ ] Terms of service
- [ ] User consent flow
- [ ] Data encryption (transit and rest)
- [ ] Secure authentication
- [ ] Account deletion capability

#### Phase 2 (Should Have)
- [ ] NPC registration (if required)
- [ ] Data processing agreements with retailers
- [ ] Cookie/tracking consent
- [ ] Data export functionality
- [ ] Audit logging

#### Phase 3 (Global Ready)
- [ ] GDPR compliance certification
- [ ] Regional data storage options
- [ ] Multi-language privacy policy
- [ ] Third-party security audit
- [ ] Compliance documentation for each market

### Compliance Cost Estimates

| Item | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| Legal review | $500-1,000 | $2,000-5,000 | $10,000-20,000 |
| Security infrastructure | Included in dev | $5,000-10,000 | $20,000-50,000 |
| Compliance tools | $0 (manual) | $100-500/month | $500-2,000/month |
| Audits | $0 | $2,000-5,000 | $10,000-25,000 |

---

## 18. Data Portability & User Rights

### User Data Rights

| Right | Description | Implementation |
|-------|-------------|----------------|
| **Access** | Users can view all their data | "Download My Data" feature |
| **Correction** | Users can fix incorrect data | Edit profile, tank info, history |
| **Deletion** | Users can delete their account | Account deletion in settings |
| **Portability** | Users can export data | JSON/CSV export |
| **Objection** | Users can opt out of processing | Marketing opt-out, analytics opt-out |

### Data Ownership Policy

| Data Type | Owner | Portability | Retention After Deletion |
|-----------|-------|-------------|-------------------------|
| User profile | User | Full export | 30 days, then purged |
| Usage history | User | Full export | 30 days, then purged |
| Tank information | User | Full export | 30 days, then purged |
| Prediction models | Platform | Not exportable | N/A |
| Aggregated analytics | Platform | Not exportable | Retained (anonymized) |

### Scenario: User Switches Retailers

| Scenario | Data Handling |
|----------|---------------|
| User changes preferred retailer in app | History retained, new retailer assigned |
| Retailer stops using platform | User keeps all data, can select new retailer |
| User moves to new location | Can add new location, keep old history |
| User wants to start fresh | Can reset tank data, keep account |

### Scenario: Retailer Offboarding

| Scenario | User Impact | Data Handling |
|----------|-------------|---------------|
| Retailer voluntary exit | Users notified, can select new retailer | User data retained |
| Retailer account suspended | Users notified, auto-assigned or select | User data retained |
| Platform discontinuation | 90-day notice, full data export | All data exportable |

### Data Export Format

```json
{
  "export_date": "2026-01-26",
  "user": {
    "name": "Maria Santos",
    "email": "maria@email.com",
    "created_at": "2025-06-15"
  },
  "tanks": [...],
  "usage_history": [...],
  "orders": [...],
  "alerts_received": [...],
  "preferences": {...}
}
```

---

## 19. Team & Resource Requirements

### Phase 1 Team (0-9 months)

| Role | Count | Type | Key Responsibilities |
|------|-------|------|---------------------|
| **Founder/PM** | 1 | Full-time | Strategy, product decisions, retailer relationships |
| **Mobile Developer** | 1 | Full-time or Contract | React Native app development |
| **Backend Developer** | 1 | Part-time or Contract | API, database, notifications |
| **Designer** | 1 | Contract | UI/UX design, branding |

**Total Team:** 2-3 full-time equivalent

**Skills Required:**
- React Native (or Flutter)
- Node.js/Python backend
- PostgreSQL
- Firebase
- Basic data analysis

### Phase 1 Budget Breakdown

| Category | Low Estimate | High Estimate |
|----------|--------------|---------------|
| Development (salaries/contracts) | $10,000 | $20,000 |
| Infrastructure (servers, services) | $1,000 | $3,000 |
| Design (UI/UX, branding) | $1,500 | $4,000 |
| Marketing (initial) | $500 | $2,000 |
| Legal (privacy policy, terms) | $500 | $1,000 |
| Miscellaneous | $500 | $1,000 |
| **Total Phase 1** | **$14,000** | **$31,000** |

### Phase 2 Team (9-18 months)

| Role | Count | Type | Key Responsibilities |
|------|-------|------|---------------------|
| **Founder/CEO** | 1 | Full-time | Strategy, fundraising, partnerships |
| **Product Manager** | 1 | Full-time | Features, roadmap, user research |
| **Mobile Developer** | 1-2 | Full-time | App features, maintenance |
| **Backend Developer** | 1-2 | Full-time | API, analytics, scale |
| **Designer** | 1 | Full-time or Contract | UI/UX, premium features |
| **Sales/BD** | 1 | Full-time | Retailer acquisition, SMB sales |

**Total Team:** 5-7 people

### Phase 2 Budget Breakdown

| Category | Low Estimate | High Estimate |
|----------|--------------|---------------|
| Salaries (team of 5-7) | $35,000 | $70,000 |
| Infrastructure | $3,000 | $8,000 |
| Marketing | $5,000 | $15,000 |
| Sales/BD expenses | $2,000 | $5,000 |
| Legal/Compliance | $2,000 | $5,000 |
| Miscellaneous | $3,000 | $7,000 |
| **Total Phase 2** | **$50,000** | **$110,000** |

### Phase 3 Team (18-30 months)

| Role | Count | Type |
|------|-------|------|
| **Executive Team** | 2-3 | CEO, CTO, COO |
| **Product** | 2-3 | PM, Designers |
| **Engineering** | 4-6 | Mobile, Backend, DevOps |
| **Sales & Marketing** | 3-4 | Sales, Marketing, Partnerships |
| **Operations** | 1-2 | Support, Success |

**Total Team:** 12-18 people

### Phase 3 Budget Breakdown

| Category | Low Estimate | High Estimate |
|----------|--------------|---------------|
| Salaries | $150,000 | $350,000 |
| Infrastructure | $15,000 | $40,000 |
| Marketing | $20,000 | $60,000 |
| Sales | $10,000 | $30,000 |
| Legal/Compliance | $10,000 | $25,000 |
| Office/Operations | $5,000 | $15,000 |
| **Total Phase 3** | **$210,000** | **$520,000** |

### Funding Strategy

| Phase | Funding Source | Amount Needed |
|-------|----------------|---------------|
| Phase 1 | Bootstrapped / Friends & Family | $15,000-30,000 |
| Phase 2 | Angel investors / Pre-seed | $75,000-150,000 |
| Phase 3 | Seed round | $300,000-750,000 |

### Build vs Buy vs Outsource

| Component | Recommendation | Rationale |
|-----------|----------------|-----------|
| Core app | Build in-house | Core competency, must control |
| Backend API | Build in-house | Core competency |
| UI/UX design | Contract initially | Can hire FT later |
| Payment integration | Buy (Stripe, PayMongo) | Commodity |
| Notifications | Buy (Firebase) | Commodity |
| Analytics | Buy (Mixpanel, Amplitude) | Faster than building |
| Sensor integration | Partner | Not core competency |

---

## 20. Open Questions & Future Considerations

### Resolved Questions (From Original)

| Question | Resolution |
|----------|------------|
| What is acceptable prediction accuracy? | ±25% Phase 1, ±15% Phase 2, ±10% Phase 3 |
| What retailer incentives drive distribution? | Free analytics, co-branding, revenue share (see Section 10) |
| What's the realistic CAC vs LTV ratio? | Target >3:1 (see Section 9) |
| Gaming/abuse threshold? | <15% users, <5% incentive budget (see Section 15) |

### Remaining Open Questions

#### Product
- [ ] What's the optimal alert timing (days before empty)?
- [ ] How to handle users who never open the app but receive alerts?
- [ ] Should we add gamification (streaks, badges)?
- [ ] How to handle seasonal usage variations (holidays, summer)?

#### Business
- [ ] What's the optimal price point for each region's purchasing power?
- [ ] Should we offer annual subscriptions at a discount?
- [ ] When to introduce white-label options for large retailers?
- [ ] Partnership opportunities with LPG manufacturers?

#### Technical
- [ ] Which weight sensors to support first? (see Appendix C)
- [ ] How to handle extended offline usage (weeks)?
- [ ] Should we build a web dashboard for retailers or mobile-only?
- [ ] API rate limiting and security for scale?

#### Competitive
- [ ] How to defend if a major LPG brand copies the model?
- [ ] Should we consider acquisition by a larger player?
- [ ] How to expand internationally without losing focus?

### Future Feature Considerations (Post-Phase 3)

| Feature | Priority | Rationale |
|---------|----------|-----------|
| AI-powered anomaly detection | High | Leak detection, safety |
| Voice assistant integration | Medium | Hands-free checking |
| Carbon footprint tracking | Medium | Sustainability trend |
| Smart appliance integration | Low | Long-term IoT play |
| B2B marketplace | Low | Only after strong neutrality |
| White-label platform | Medium | Enterprise revenue stream |

---

## 21. User Engagement & Retention Strategy

### The Engagement Challenge

LPG tracking apps face a unique engagement problem:

| Reality | Challenge |
|---------|-----------|
| Home users refill every 30-60 days | Very low natural app interaction |
| Between refills, no compelling reason to open app | Users forget the app exists |
| LPG is a "set and forget" utility | Risk of uninstalls before next refill cycle |
| Value delivered passively (alerts) | Users may not perceive ongoing value |

**Key Insight:** Unlike social media or productivity apps, an LPG tracker should NOT aim for daily engagement. The goal is: **be there when needed, stay top-of-mind, deliver clear value**.

---

### Engagement Philosophy

#### What We Believe

| Principle | Implication |
|-----------|-------------|
| Respect user attention | Don't notify unless valuable |
| Passive value is still value | Alerts that prevent empty tanks = high value even if low interaction |
| Engagement ≠ Opens | A user who never opens but gets timely alerts is a success |
| Forced engagement backfires | Gamification for its own sake feels hollow |

#### What We Avoid

| Anti-Pattern | Why It's Bad |
|--------------|--------------|
| Daily push notifications | Annoys users, causes notification fatigue |
| Pointless gamification | "You earned 10 gas points!" feels meaningless |
| Engagement theater | Metrics that look good but don't reflect value |
| Dark patterns | Guilt-tripping users to open the app |

---

### Engagement Model by User Type

#### Home Users (Low-Frequency, High-Value)

**Natural Interaction Points:**
- Refill logging (every 30-60 days)
- Responding to low alerts
- Checking remaining days occasionally

**Engagement Strategy:**

| Touchpoint | Frequency | Channel | Content |
|------------|-----------|---------|---------|
| Weekly status | 1x/week | Push (optional) | "Day 28 of ~43. You're good." |
| Approaching low | When <10 days left | Push | "~8 days remaining. Time to plan a refill." |
| Low alert | When <5 days left | Push + SMS | "Running low! Order now?" |
| Monthly summary | 1x/month | In-app | "January: 1 refill, on track" |
| Post-refill confirmation | After logging | In-app | "Logged! Next refill estimated ~Feb 28" |
| Quarterly value reminder | 1x/quarter | Push | "You've avoided 2 empty-tank surprises" |

**Engagement UI - Weekly Status (Optional):**
```
┌─────────────────────────────────────────────┐
│  📱 Weekly Check-in                         │
├─────────────────────────────────────────────┤
│                                             │
│  Your tank status this week:               │
│                                             │
│  Day 28 of ~43                             │
│  ████████████████░░░░░░░                   │
│                                             │
│  Status: All good ✓                        │
│  Estimated refill: ~Feb 15                 │
│                                             │
│  [Got it]  [Open App]                      │
│                                             │
└─────────────────────────────────────────────┘
```

**Settings - Notification Preferences:**
```
┌─────────────────────────────────────────────┐
│  🔔 Notification Preferences                │
├─────────────────────────────────────────────┤
│                                             │
│  Essential Alerts (recommended)            │
│  ─────────────────────────────────────     │
│  ☑ Low LPG alerts         (can't disable) │
│  ☑ Order confirmations                     │
│                                             │
│  Optional Updates                          │
│  ─────────────────────────────────────     │
│  ☐ Weekly status check-in                  │
│  ☐ Monthly usage summary                   │
│  ☐ Tips and insights                       │
│                                             │
│  Quiet Hours                               │
│  ─────────────────────────────────────     │
│  Don't notify between: [9 PM] - [7 AM]     │
│                                             │
└─────────────────────────────────────────────┘
```

#### Small Business Users (Medium-Frequency)

**Natural Interaction Points:**
- More frequent refills (every 2-4 weeks)
- Cost tracking for accounting
- Usage monitoring for budgeting

**Engagement Strategy:**

| Touchpoint | Frequency | Channel | Content |
|------------|-----------|---------|---------|
| Low alert | When <5 days left | Push + SMS | "Tank 1 running low - 3 days left" |
| Weekly summary | 1x/week | Push + Email | "This week: 2 tanks at 50%, 1 needs refill" |
| Monthly report | 1x/month | Email + In-app | "January report: 3 refills, ₱2,850 spent" |
| Cost anomaly | When detected | Push | "Usage 25% higher than usual this week" |
| Multi-tank status | Daily (if enabled) | Push | "Morning brief: All 3 tanks OK" |

#### Retailer Users (High-Frequency)

**Natural Interaction Points:**
- Daily order management
- Customer status monitoring
- Delivery coordination

**Engagement Strategy:**

| Touchpoint | Frequency | Channel | Content |
|------------|-----------|---------|---------|
| New order | Immediate | Push + SMS | "New order from Maria Santos - 11kg" |
| Daily summary | Morning | Push | "Today: 5 orders pending, 8 customers running low" |
| Weekly report | 1x/week | Email + In-app | "This week: 32 orders, ₱29,700 revenue" |
| Customer running low | As detected | In-app | Badge count on "Running Low" tab |
| Demand forecast | Weekly | In-app | "Next week forecast: ~38 orders" |

---

### Notification Strategy

#### Notification Hierarchy

| Priority | Type | Channels | Can Disable? |
|----------|------|----------|--------------|
| **Critical** | Empty tank warning, Order received | Push + SMS | No |
| **High** | Low alert (5-10 days), Order status | Push | No (can adjust threshold) |
| **Medium** | Weekly status, Monthly summary | Push | Yes |
| **Low** | Tips, Insights, Promotions | In-app only | Yes |

#### Notification Frequency Caps

| User Type | Max Notifications/Week | Exception |
|-----------|------------------------|-----------|
| Home | 2 | Critical alerts bypass |
| Small Business | 5 | Critical alerts bypass |
| Retailer | Unlimited (order-driven) | N/A |

#### Notification Content Guidelines

**Good Notifications:**
```
✓ "~7 days of LPG left. Good time to order."
✓ "Your January summary is ready. Tap to view."
✓ "Order confirmed! Mang Pedro will deliver tomorrow."
```

**Bad Notifications:**
```
✗ "You haven't opened the app in 3 days!"
✗ "Earn 50 points by logging your usage today!"
✗ "Don't forget about us! Open the app now!"
```

---

### Re-engagement Strategy

#### Dormant User Definition

| User Type | Dormant After | At Risk After |
|-----------|---------------|---------------|
| Home | 14 days no open + no refill logged | 45 days |
| Small Business | 7 days no open | 21 days |
| Retailer | 3 days no open | 7 days |

#### Re-engagement Flows

**Flow 1: Gentle Reminder (At Risk)**

Trigger: User hasn't opened app in 14 days (home) or 7 days (business)

```
┌─────────────────────────────────────────────┐
│  📱 Push Notification                       │
├─────────────────────────────────────────────┤
│                                             │
│  Still tracking your LPG?                  │
│                                             │
│  Your tank is on day 35. Estimate: ~8 days │
│  remaining.                                │
│                                             │
│  [Check Status]  [Dismiss]                 │
│                                             │
└─────────────────────────────────────────────┘
```

**Flow 2: Value Reminder (Dormant)**

Trigger: User hasn't opened app in 30+ days

```
┌─────────────────────────────────────────────┐
│  📱 Push Notification                       │
├─────────────────────────────────────────────┤
│                                             │
│  Did you refill recently?                  │
│                                             │
│  If you got a new tank, log it to keep     │
│  your estimates accurate.                  │
│                                             │
│  [Log Refill]  [Still on same tank]        │
│                                             │
└─────────────────────────────────────────────┘
```

**Flow 3: Win-Back (Churned)**

Trigger: User hasn't engaged in 60+ days

Channel: Email (not push - respect boundaries)

```
Subject: Your LPG tracking is paused

Hi [Name],

We noticed you haven't logged a refill in a while.
No worries - your account is still here.

If you've been refilling without logging, your estimates
might be off. Quick update:

→ Log your recent refill: [link]
→ Or let us know if you've switched to a different setup

Still have questions? Reply to this email.

- The LPG Tracker Team
```

#### Re-engagement Limits

| Attempt | Timing | Channel | If No Response |
|---------|--------|---------|----------------|
| 1st | Day 14 | Push | Wait |
| 2nd | Day 30 | Push | Wait |
| 3rd | Day 45 | Email | Wait |
| 4th | Day 60 | Email | Mark as churned, stop outreach |

**Rule:** After 4 attempts with no response, stop all re-engagement. User can return on their own.

---

### Retention Mechanics

#### Value Reinforcement

Show users the value they're getting, without being pushy.

**Monthly Summary Card:**
```
┌─────────────────────────────────────────────┐
│  📊 Your January Summary                    │
├─────────────────────────────────────────────┤
│                                             │
│  This Month                                │
│  ─────────────────────────────────────     │
│  Refills logged: 1                         │
│  Prediction accuracy: Within 3 days ✓      │
│  Alerts sent: 2 (1 low, 1 very low)       │
│                                             │
│  Since You Started (6 months)              │
│  ─────────────────────────────────────     │
│  Empty tank emergencies avoided: 3         │
│  Average prediction accuracy: ±4 days      │
│  Total refills tracked: 5                  │
│                                             │
│  [View Full History]                       │
│                                             │
└─────────────────────────────────────────────┘
```

**Yearly Review (Anniversary):**
```
┌─────────────────────────────────────────────┐
│  🎉 Your Year with LPG Tracker              │
├─────────────────────────────────────────────┤
│                                             │
│  1 Year of Tracking                        │
│  ─────────────────────────────────────     │
│                                             │
│  📦 12 refills logged                       │
│  ⚠️  8 low alerts sent                      │
│  ✓  0 empty tank emergencies               │
│  📊 Average cycle: 43 days                  │
│  💰 Total spent: ~₱11,400                   │
│                                             │
│  Your accuracy improved from ±12 days      │
│  to ±3 days as we learned your pattern.    │
│                                             │
│  Thanks for a great year! 🙏               │
│                                             │
│  [Share]  [View Details]                   │
│                                             │
└─────────────────────────────────────────────┘
```

#### Milestone Celebrations (Subtle)

| Milestone | Message | When |
|-----------|---------|------|
| First refill logged | "Nice! Your next estimate will be more accurate." | After first log |
| 3 refills logged | "Your predictions are getting better!" | After 3rd log |
| 6 months active | "6 months of never running out. 👏" | 6-month anniversary |
| 1 year active | "1 year! See your year in review." | 1-year anniversary |
| 0 emergencies | "Another month with no surprises." | Monthly (if applicable) |

**Important:** These are subtle, not gamified. No points, no leaderboards, no badges.

---

### Engagement Metrics & Targets

#### Primary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **DAU/MAU Ratio** | Daily active / Monthly active | 5-10% (low is OK) |
| **Refill Log Rate** | % of actual refills logged | ≥70% |
| **Alert Response Rate** | % of low alerts → refill within 7 days | ≥60% |
| **30-Day Retention** | % still active after 30 days | ≥40% |
| **90-Day Retention** | % still active after 90 days | ≥25% |
| **Churn Rate** | % users who stop using per month | ≤8% |

#### Secondary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Notification opt-out rate | % who disable optional notifications | ≤30% |
| Re-engagement success | % of dormant users who return | ≥15% |
| NPS (Net Promoter Score) | Would you recommend? | ≥30 |
| App store rating | Average rating | ≥4.2 |

#### Engagement Quality Score

Not all engagement is equal. Track quality, not just quantity.

| Signal | Weight | Good | Bad |
|--------|--------|------|-----|
| Logged refill | High | User is actively using | - |
| Responded to alert | High | System is working | - |
| Opened monthly summary | Medium | User values insights | - |
| Opened app with no action | Low | - | Might be confusing UX |
| Disabled notifications | Negative | - | We're being annoying |
| Uninstalled | Very Negative | - | We failed |

---

### Engagement by Phase

#### Phase 1 (MVP) Engagement Features

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Low LPG alerts | P0 | Core value proposition |
| Refill logging | P0 | Improves accuracy, creates habit |
| Basic notification settings | P0 | Respect user preferences |
| Post-refill confirmation | P1 | Immediate feedback loop |

#### Phase 2 Engagement Features

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Weekly status (optional) | P1 | Keep app top-of-mind |
| Monthly summary | P1 | Value reinforcement |
| Notification preferences | P0 | More control for users |
| Re-engagement flows | P1 | Recover at-risk users |
| Value milestones | P2 | Subtle retention boost |

#### Phase 3 Engagement Features

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Yearly review | P1 | Anniversary retention |
| Predictive re-engagement | P2 | ML-based churn prediction |
| Community features (optional) | P3 | Only if organic demand |

---

### What NOT to Do

#### Engagement Anti-Patterns to Avoid

| Anti-Pattern | Why It's Harmful | What to Do Instead |
|--------------|------------------|-------------------|
| Daily notifications | Causes fatigue, uninstalls | Weekly at most (optional) |
| Points/coins/rewards | Feels hollow for utility app | Show real value (days saved) |
| Streaks | Punishes users for having stable usage | Celebrate milestones instead |
| Social features | LPG is private, not social | Skip unless requested |
| Leaderboards | Comparing gas usage is meaningless | Don't implement |
| Push notification guilt | "You haven't opened in 3 days!" | Provide value, not guilt |
| Forced app opens | Requiring app open to see status | Allow notification-only mode |
| Dark patterns | Hiding unsubscribe, tricky UX | Be transparent, easy opt-out |

#### The "Honest Utility" Approach

This app succeeds when:
1. Users never run out of gas unexpectedly
2. Users trust the predictions
3. Users feel the app respects their time
4. Users recommend it to others

This app does NOT need:
- Daily opens
- High session times
- Viral loops
- Addictive mechanics

**Measure value delivered, not attention captured.**

---

### Engagement Testing Plan

#### A/B Tests to Run

| Test | Variants | Success Metric |
|------|----------|----------------|
| Weekly notification | On vs Off (default) | 30-day retention, opt-out rate |
| Notification timing | Morning vs Evening | Open rate, response rate |
| Summary frequency | Weekly vs Monthly | Engagement, opt-out rate |
| Re-engagement message | Value-focused vs Status-focused | Return rate |
| Milestone messages | With vs Without | Retention, NPS |

#### Test Principles

1. **Measure uninstalls** — If a feature increases uninstalls, it's net negative
2. **Track opt-outs** — High opt-out = we're being annoying
3. **Long-term retention over short-term opens** — Don't optimize for vanity metrics
4. **Ask users** — Periodic feedback surveys (quarterly, opt-in)

---

### Summary: Engagement Approach

| Principle | Implementation |
|-----------|----------------|
| **Be useful, not needy** | Alerts that matter, not attention grabs |
| **Respect attention** | Minimal notifications, easy opt-out |
| **Show value passively** | Monthly summaries, milestone celebrations |
| **Recover gracefully** | Gentle re-engagement, stop after 4 attempts |
| **Measure what matters** | Retention and refill logs, not DAU |
| **Avoid dark patterns** | Transparent, honest, user-first |

**The goal:** Users who trust the app, recommend it to others, and never run out of gas — even if they only open it once a month.

---

## 22. Gaps & Loopholes Checklist

This checklist tracks identified gaps, loopholes, and underdeveloped areas in the product strategy. Use this to ensure all critical areas are addressed before launch.

**Legend:**
- [ ] Not started
- [~] In progress / Partially addressed
- [x] Completed / Documented

---

### Critical Priority (Must Address Before MVP)

#### Onboarding & First-Time User Experience

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | [ ] First-time user flow documented | | How does user set up first tank? |
| 1.2 | [ ] Tank size selection helper | | What if user doesn't know their tank size? |
| 1.3 | [ ] Initial estimate explanation | | Set expectations for first-cycle accuracy |
| 1.4 | [ ] Onboarding for users without retailer | | User downloads directly, not via retailer invite |
| 1.5 | [ ] Retailer onboarding flow documented | | First-time retailer setup |
| 1.6 | [ ] Permission requests timing | | When to ask for notifications, location, etc. |
| 1.7 | [ ] Onboarding success metrics defined | | Completion rate, drop-off points |

#### Offline Functionality

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | [ ] Offline mode requirements defined | | What works without internet? |
| 2.2 | [ ] Offline refill logging | | Queue and sync when online |
| 2.3 | [ ] Offline alert display | | Show last known status |
| 2.4 | [ ] Data sync strategy | | Conflict resolution when back online |
| 2.5 | [ ] Offline indicator in UI | | User knows they're offline |
| 2.6 | [ ] SMS fallback for critical alerts | | If push fails, send SMS |

#### Legal & Liability

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | [ ] Terms of Service drafted | | Liability limitations |
| 3.2 | [ ] Privacy Policy drafted | | Data collection, usage, sharing |
| 3.3 | [ ] Prediction disclaimer | | "Estimates only, not guarantees" |
| 3.4 | [ ] Delivery liability clarified | | App facilitates, doesn't guarantee |
| 3.5 | [ ] Retailer terms of service | | Separate ToS for retailers |
| 3.6 | [ ] Data retention policy | | How long data is kept |
| 3.7 | [ ] GDPR/Privacy law compliance | | By target market |
| 3.8 | [ ] Dispute resolution process | | Customer vs retailer disputes |

---

### High Priority (Address Before Public Launch)

#### Account & Identity Management

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | [ ] Account recovery flow | | Lost phone, forgot password |
| 4.2 | [ ] Phone number change process | | User changes number |
| 4.3 | [ ] Device migration flow | | Old phone → new phone |
| 4.4 | [ ] Account deletion flow | | GDPR right to deletion |
| 4.5 | [ ] Multi-device support decision | | Same account on multiple devices? |
| 4.6 | [ ] Session management | | Auto-logout, concurrent sessions |
| 4.7 | [ ] Identity verification for retailers | | Prevent fake retailer accounts |

#### Fraud & Abuse Prevention

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | [ ] Fake account detection | | Bot prevention, verification |
| 5.2 | [ ] Referral abuse prevention | | Self-referrals, referral farms |
| 5.3 | [ ] Fake order prevention | | Spam orders to retailers |
| 5.4 | [ ] Retailer spam prevention | | Excessive customer messaging |
| 5.5 | [ ] Review/rating manipulation | | If ratings are added later |
| 5.6 | [ ] Rate limiting defined | | API limits, action limits |
| 5.7 | [ ] Reporting mechanism | | User reports abuse |
| 5.8 | [ ] Account suspension process | | For violators |

#### Support & Help

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | [ ] FAQ / Help center content | | Common questions answered |
| 6.2 | [ ] In-app help access | | How to get help from within app |
| 6.3 | [ ] Support channel defined | | Email? Chat? Phone? |
| 6.4 | [ ] Support SLA defined | | Response time expectations |
| 6.5 | [ ] Escalation process | | For complex issues |
| 6.6 | [ ] Customer-retailer dispute process | | Who mediates? |
| 6.7 | [ ] Bug reporting mechanism | | How users report issues |
| 6.8 | [ ] Feedback collection method | | How to gather user feedback |

---

### Medium Priority (Address Before Scale)

#### Accessibility (a11y)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | [ ] Screen reader compatibility | | VoiceOver, TalkBack |
| 7.2 | [ ] Color contrast compliance | | WCAG AA minimum |
| 7.3 | [ ] Touch target sizes | | Minimum 44x44 points |
| 7.4 | [ ] Text scaling support | | Dynamic type |
| 7.5 | [ ] Color blindness considerations | | Don't rely on color alone |
| 7.6 | [ ] Reduced motion option | | For vestibular disorders |
| 7.7 | [ ] Elderly user considerations | | Larger text, simpler flows |

#### Edge Cases & Error Handling

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | [ ] Tank damaged/lost scenario | | User needs to reset |
| 8.2 | [ ] Retailer closes business | | Reassign customers? |
| 8.3 | [ ] User moves to new address | | Update location, retailer? |
| 8.4 | [ ] Multiple users same tank | | Family/roommate scenario |
| 8.5 | [ ] User switches to different fuel | | Close account gracefully |
| 8.6 | [ ] Retailer rejects order | | Notify user, next steps |
| 8.7 | [ ] Delivery failed | | Retry flow |
| 8.8 | [ ] App crash recovery | | State preservation |
| 8.9 | [ ] Server downtime handling | | Graceful degradation |

#### Pricing & Monetization Validation

| # | Item | Status | Notes |
|---|------|--------|-------|
| 9.1 | [ ] Consumer willingness-to-pay research | | Survey/interview target users |
| 9.2 | [ ] Retailer willingness-to-pay research | | What would they pay? |
| 9.3 | [ ] Price sensitivity testing | | Different price points |
| 9.4 | [ ] Free vs premium feature split validation | | Is the split compelling? |
| 9.5 | [ ] Payment method availability | | GCash, Maya adoption rates |
| 9.6 | [ ] Billing failure handling | | Card declined, retry logic |
| 9.7 | [ ] Subscription cancellation flow | | Easy, not dark pattern |
| 9.8 | [ ] Refund policy defined | | Under what conditions? |

#### Competitive & Market

| # | Item | Status | Notes |
|---|------|--------|-------|
| 10.1 | [ ] Competitor response scenarios | | What if major player enters? |
| 10.2 | [ ] Retailer builds own app scenario | | How to retain users? |
| 10.3 | [ ] LPG brand partnership threats | | Brand launches competing app |
| 10.4 | [ ] Market entry barriers identified | | What protects us? |
| 10.5 | [ ] Differentiation sustainability | | Can competitors copy easily? |

---

### Lower Priority (Address During Growth)

#### Seasonal & Contextual

| # | Item | Status | Notes |
|---|------|--------|-------|
| 11.1 | [ ] Seasonal usage pattern handling | | Holiday spikes, summer dips |
| 11.2 | [ ] Weather integration (optional) | | Cold weather = more usage |
| 11.3 | [ ] Event-based adjustments | | User marks "hosting party" |
| 11.4 | [ ] Vacation/travel mode | | User away, usage drops |

#### Partnership Strategy

| # | Item | Status | Notes |
|---|------|--------|-------|
| 12.1 | [ ] LPG brand partnership model | | Co-marketing? White-label? |
| 12.2 | [ ] Hardware partner criteria | | Which sensors to support? |
| 12.3 | [ ] Payment provider partnerships | | GCash, Maya integration |
| 12.4 | [ ] Appliance maker partnerships | | Smart stove integration |
| 12.5 | [ ] Distribution partnerships | | Telcos, banks, etc. |

#### Data & Analytics Strategy

| # | Item | Status | Notes |
|---|------|--------|-------|
| 13.1 | [ ] Data collection inventory | | What do we collect? |
| 13.2 | [ ] Analytics implementation plan | | What do we track? |
| 13.3 | [ ] Data anonymization for insights | | Sell market insights? |
| 13.4 | [ ] ML model training data strategy | | How to improve predictions? |
| 13.5 | [ ] A/B testing infrastructure | | Feature experimentation |

#### Business Continuity

| # | Item | Status | Notes |
|---|------|--------|-------|
| 14.1 | [ ] Disaster recovery plan | | Server failure, data loss |
| 14.2 | [ ] Data backup strategy | | Frequency, retention |
| 14.3 | [ ] Service degradation plan | | What works if X fails? |
| 14.4 | [ ] Sunset/exit plan | | If business fails, user data? |
| 14.5 | [ ] Acquisition preparation | | Data portability for exit |

#### Localization & Expansion

| # | Item | Status | Notes |
|---|------|--------|-------|
| 15.1 | [ ] Translation infrastructure | | i18n framework |
| 15.2 | [ ] Cultural adaptation guidelines | | Beyond just translation |
| 15.3 | [ ] Local payment methods by market | | India: UPI, Indonesia: OVO, etc. |
| 15.4 | [ ] Local regulations by market | | Compliance checklist per country |
| 15.5 | [ ] Local support channels | | Language-specific support |

---

### Validation Checklist (Pre-Launch)

| # | Item | Status | Notes |
|---|------|--------|-------|
| V1 | [ ] User testing completed (onboarding) | | 10+ users tested |
| V2 | [ ] User testing completed (core flow) | | Refill logging, alerts |
| V3 | [ ] Retailer testing completed | | 5+ retailers tested |
| V4 | [ ] Pricing validation completed | | Survey or pilot data |
| V5 | [ ] Legal review completed | | ToS, Privacy Policy approved |
| V6 | [ ] Security audit completed | | Penetration testing |
| V7 | [ ] Accessibility audit completed | | WCAG compliance |
| V8 | [ ] Performance testing completed | | Load testing |
| V9 | [ ] Offline testing completed | | Works without network |
| V10 | [ ] Edge case testing completed | | Error scenarios |

---

### Summary: Priority Matrix

| Priority | Category | Item Count | Target Completion |
|----------|----------|------------|-------------------|
| **Critical** | Onboarding | 7 items | Before MVP |
| **Critical** | Offline | 6 items | Before MVP |
| **Critical** | Legal | 8 items | Before MVP |
| **High** | Account Management | 7 items | Before public launch |
| **High** | Fraud Prevention | 8 items | Before public launch |
| **High** | Support | 8 items | Before public launch |
| **Medium** | Accessibility | 7 items | Before scale |
| **Medium** | Edge Cases | 9 items | Before scale |
| **Medium** | Pricing Validation | 8 items | Before scale |
| **Medium** | Competitive | 5 items | Before scale |
| **Lower** | Seasonal | 4 items | During growth |
| **Lower** | Partnerships | 5 items | During growth |
| **Lower** | Data/Analytics | 5 items | During growth |
| **Lower** | Business Continuity | 5 items | During growth |
| **Lower** | Localization | 5 items | During growth |
| **Validation** | Pre-Launch Checks | 10 items | Before launch |

**Total: 104 items to track**

---

### How to Use This Checklist

1. **Review weekly** during planning phase
2. **Update status** as items are addressed:
   - `[ ]` → `[~]` when work begins
   - `[~]` → `[x]` when documented/completed
3. **Add notes** for context, decisions, or links to detailed docs
4. **Prioritize** critical items for MVP, defer lower priority items
5. **Don't skip legal** — this can block launch

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Cylinder Exchange | LPG model where empty tank is swapped for full tank |
| Cylinder Refill | LPG model where customer's tank is refilled at station |
| Bulk Tank | Large stationary LPG tank with scheduled deliveries |
| DAU | Daily Active Users |
| WAU | Weekly Active Users |
| MAU | Monthly Active Users |
| CAC | Customer Acquisition Cost |
| LTV | Lifetime Value (total revenue from a customer) |
| MRR | Monthly Recurring Revenue |
| ARR | Annual Recurring Revenue |
| ARPU | Average Revenue Per User |
| NPS | Net Promoter Score |
| SaaS | Software as a Service |
| B2B2C | Business-to-Business-to-Consumer distribution model |
| K-Factor | Virality coefficient (users generated per user) |
| Churn | Rate at which customers stop using the service |

---

## Appendix B: Sample User Journeys

### Journey 1: Household User (Maria)

1. **Day 1:** Maria's retailer recommends the app when delivering LPG
2. **Setup:** Maria enters 11kg tank, light cooking (3 hrs/day)
3. **Day 15:** App shows "68% remaining, ~25 days left"
4. **Day 32:** Alert: "5 days remaining, order now for peace of mind"
5. **Day 33:** Maria taps "Order Refill" — request sent to retailer
6. **Day 35:** New tank delivered, Maria taps "Tank Replaced"
7. **Day 36:** App asks: "Was our estimate accurate?" Maria taps "Close enough"
8. **Ongoing:** Maria trusts the app, opens weekly to check status

### Journey 2: Restaurant Owner (Carlo)

1. **Day 1:** Carlo's supplier introduces the app as business tool
2. **Setup:** Carlo registers 3 tanks (22kg each), heavy restaurant use
3. **Week 1:** App tracks consumption, shows ~4kg/day usage
4. **Week 2:** Carlo sees "Tank 2 needs refill in 3 days"
5. **Month 1:** Carlo notices value, considers Premium
6. **Month 2:** Carlo upgrades to Premium for analytics
7. **Month 3:** Carlo uses cost reports for budget planning
8. **Ongoing:** Carlo relies on app for all LPG management, reduces emergency orders by 80%

### Journey 3: Retailer (Mang Pedro's LPG)

1. **Week 1:** Mang Pedro joins pilot program, gets free dashboard
2. **Week 2:** Distributes app to 50 regular customers
3. **Month 1:** Sees which customers are running low before they call
4. **Month 2:** Proactively reaches out to customers, improves service
5. **Month 3:** Notices 30% reduction in "emergency" deliveries
6. **Month 6:** Subscribes to Standard tier for full analytics
7. **Year 1:** Recommends platform to fellow retailers

---

## Appendix C: Hardware Integration Roadmap

### Phase 2: Optional Weight Sensor Support

#### Target Sensors (Initial)

| Sensor Type | Brand Examples | Price Range | Connection | Accuracy |
|-------------|----------------|-------------|------------|----------|
| **Bluetooth Scale** | Xiaomi, Generic | $15-30 | BLE | ±0.1kg |
| **WiFi Scale** | Custom, Tuya-based | $30-50 | WiFi | ±0.1kg |
| **Industrial Load Cell** | HX711-based | $20-40 | Wired + Hub | ±0.05kg |

#### Integration Architecture

```
[Weight Sensor] → [Bluetooth/WiFi] → [Mobile App] → [Backend API]
                                           ↓
                               [Update Tank Level]
                                           ↓
                               [Recalculate Predictions]
```

#### Integration Requirements

| Requirement | Specification |
|-------------|---------------|
| **SDK Support** | React Native BLE library |
| **Pairing Flow** | Simple one-time setup |
| **Sync Frequency** | Every 30 minutes or on-demand |
| **Battery** | Sensor battery status in app |
| **Offline** | Cache readings, sync later |

#### Sensor Partnership Strategy

| Approach | Pros | Cons |
|----------|------|------|
| **Recommend third-party** | No inventory, no support burden | Less control, variable quality |
| **White-label sensors** | Branded experience, controlled quality | Inventory, support, capital |
| **Partner with manufacturer** | Best of both | Negotiation, dependency |

**Recommendation:** Start with recommending third-party sensors, move to partnership in Phase 3.

### Phase 3: Advanced Hardware

| Hardware | Use Case | Priority |
|----------|----------|----------|
| Flow meters | Commercial/restaurant | Medium |
| Pressure sensors | Leak detection | Low |
| Smart valves | Auto shut-off | Low |
| Hub devices | Multi-sensor management | Medium |

---

## Appendix D: Financial Model Details

### Unit Economics

#### Household User

| Metric | Free Tier | Premium Tier |
|--------|-----------|--------------|
| CAC | $0.75 | $0.75 |
| Monthly Revenue | $0 | $2 |
| Gross Margin | N/A | 85% |
| Avg. Lifespan | 6 months | 12 months |
| LTV | $0 | $24 |
| LTV:CAC | N/A (funnel) | 32:1 |

#### SMB User

| Metric | Free Tier | Premium Tier |
|--------|-----------|--------------|
| CAC | $10 | $10 |
| Monthly Revenue | $0 | $20 |
| Gross Margin | N/A | 80% |
| Avg. Lifespan | 12 months | 18 months |
| LTV | $0 | $360 |
| LTV:CAC | N/A (funnel) | 36:1 |

#### Retailer

| Metric | Value |
|--------|-------|
| CAC | $250 |
| Monthly Revenue | $50 |
| Gross Margin | 75% |
| Avg. Lifespan | 24 months |
| LTV | $1,200 |
| LTV:CAC | 4.8:1 |

### Break-Even Analysis

#### Phase 1 (Monthly Burn: ~$3,000)
Break-even requires: 150 SMB Premium users @ $20/month

#### Phase 2 (Monthly Burn: ~$8,000)
Break-even requires: 200 SMB Premium + 1,000 HH Premium + 20 Retailers

#### Phase 3 (Monthly Burn: ~$25,000)
Break-even requires: 500 SMB Premium + 5,000 HH Premium + 100 Retailers

### Sensitivity Analysis

#### Revenue Sensitivity to Conversion Rates

| Scenario | HH Conv. | SMB Conv. | Phase 2 MRR |
|----------|----------|-----------|-------------|
| Pessimistic | 2% | 10% | $8,000 |
| Base Case | 5% | 25% | $20,000 |
| Optimistic | 10% | 40% | $45,000 |

*Assuming 50,000 HH users, 2,000 SMB users, 20 retailers*

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-26 | — | Initial structured document from strategy discussions |
| 2.0 | 2026-01-26 | — | Added: Competitive landscape, Regulatory compliance, Data portability, Team requirements, CAC analysis, Revenue scenarios, Prediction accuracy thresholds, Kill criteria expansion, Retailer incentives, Network effects mechanism, Hardware roadmap, Decision gates |

---

*This document consolidates strategic discussions and should be treated as a living document, updated as the product evolves.*
