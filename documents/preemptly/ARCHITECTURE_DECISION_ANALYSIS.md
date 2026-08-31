# Architecture Decision Analysis: Shared vs Separate Apps

## Context

This document evaluates whether the two products — **Healthcare (multi-tenant SaaS platform)** and **LPG App (gas tracking consumer app)** — should be built as a single parent application with shared functionality, or as two completely separate applications.

---

## Options Evaluated

### Option 1: Single Parent App (Monorepo + Shared Auth + Shared Packages)

```
AllGuds (Parent App)
  ├── Shared: Auth, User Profiles, Notifications, UI Kit
  ├── Healthcare Module
  └── LPG Module
```

Development is shared in a monorepo, but apps deploy as two separate standalone apps (separate app store listings, separate domains, separate infrastructure).

### Option 2: Two Completely Separate Apps

```
AllGuds Healthcare  → Standalone repo, standalone app
AllGuds LPG         → Standalone repo, standalone app
```

No shared code, no shared infrastructure. Each app is fully independent.

---

## Option 1 Analysis: Shared Monorepo

### What Would Be Shared

| Shared Layer | Description |
|-------------|-------------|
| Authentication / Login | One account, SSO across modules |
| User profile & settings | Name, phone, email, preferences |
| Notification system | Push notifications, SMS, email infrastructure |
| UI component library | Design system, buttons, forms, theme |
| File upload/storage | Common file handling utilities |
| CI/CD & DevOps | Same pipeline, deployment strategy |

### What Must Stay Separate

| Separate Layer | Reason |
|---------------|--------|
| Business logic | Completely different domains |
| Database schemas | Healthcare needs HIPAA audit tables; LPG needs tank/retailer models |
| Compliance layers | HIPAA requirements would unnecessarily burden the LPG app |
| Mobile UX/flows | Different user types, different complexity levels |
| Offline sync logic | Different data models require different sync strategies |
| Infrastructure | Healthcare needs HIPAA-compliant hosting; LPG does not |

### Advantages

| Advantage | Real Impact |
|-----------|------------|
| Single sign-on for users who use both apps | Only matters if users overlap — an LPG household user likely does not need a healthcare app. **Very rare overlap expected.** |
| Shared UI component library | Saves ~10-15% dev time on UI. Nice but not game-changing. |
| Consistent branding | Could also be achieved with a shared Figma design system and no monorepo. |
| Code reuse (auth client, API helpers, utils) | Saves a few days of setup per app. Copy-paste achieves 80% of the same benefit. |
| Single repo to manage | Easier for a small team (2-3 devs) to navigate one repo vs two. |
| Cross-sell potential | Only works if there is actual user overlap. |

### Disadvantages

| Disadvantage | Impact |
|-------------|--------|
| Monorepo tooling overhead | Turborepo/Nx setup, workspace configs, shared package versioning — adds complexity from day 1. |
| Coupled release risk | A bad shared package update can break both apps. |
| HIPAA scope anxiety | Even if technically clean, time is spent explaining and proving isolation to auditors, partners, and clients. |
| Team scaling gets messy | When teams grow, monorepo ownership boundaries become political. |
| Slower CI | Both apps in one repo means CI needs to be smart about what to build. |
| Different pace of development | LPG needs to ship fast (MVP validation). Healthcare needs to ship carefully (compliance). Monorepo creates friction. |

---

## HIPAA Security Considerations

### The Core Risk

If both apps share the same auth service and user database:

| Risk | Scenario |
|------|----------|
| Data leakage | A vulnerability in the LPG app could expose a path to healthcare data |
| Compliance scope creep | Shared infrastructure means HIPAA auditors may want to audit everything, including the LPG app |
| Breach liability | If the shared auth service is breached, both apps' users are compromised |
| Audit surface | HIPAA requires logging every access to PHI — shared components complicate audit trails |

### Mitigation (If Shared Auth Is Chosen)

The principle: **share identity, not data or infrastructure.**

```
                    ┌─────────────────────────────┐
                    │   Identity Provider (IdP)    │
                    │   auth.allguds.com           │
                    │                              │
                    │   Stores ONLY:               │
                    │   - email/phone              │
                    │   - password hash            │
                    │   - user_id (UUID)           │
                    │   - NO health data           │
                    │   - NO business data         │
                    └──────────┬───────────────────┘
                               │
                 ┌─────────────┴─────────────────┐
                 │                               │
    ┌────────────▼──────────┐      ┌─────────────▼─────────────┐
    │   LPG Environment     │      │   Healthcare Environment  │
    │                       │      │                           │
    │ • Own API servers     │      │ • Own API servers         │
    │ • Own database        │      │ • Own database            │
    │ • Own file storage    │      │ • Own file storage        │
    │ • Standard security   │      │ • HIPAA-compliant infra   │
    │ • No PHI anywhere     │      │ • Encryption at rest      │
    │                       │      │ • Audit logging           │
    │ NOT in HIPAA scope    │      │ • BAA with cloud provider │
    │                       │      │ • IN HIPAA scope          │
    └───────────────────────┘      └───────────────────────────┘
```

- Auth service stores **zero PHI** — only login credentials
- Each app gets its own JWT token with app-specific scopes
- A compromised LPG token cannot access healthcare APIs
- Completely separate databases, API servers, and cloud infrastructure
- HIPAA auditors can clearly see the boundary

### Infrastructure Isolation Required

| Layer | LPG | Healthcare |
|-------|-----|-----------|
| API servers | Standard cloud | HIPAA-eligible region |
| Database | Standard PostgreSQL | Encrypted, HIPAA-compliant RDS |
| File storage | Standard S3 | HIPAA S3 with access logging |
| Cloud account | Standard | Separate AWS account recommended |
| Audit logging | Standard | Full HIPAA audit trail |
| BAA required | No | Yes (with AWS/GCP) |
| Penetration testing | Annual | Required, more frequent |

---

## Recommendation

### Decision: Build Two Completely Separate Apps

**Rationale:**

1. **User overlap is expected to be very low.** An LPG household user in the Philippines has little reason to use a healthcare SaaS platform. The single sign-on advantage is near zero.

2. **LPG app needs speed.** The LPG strategy document sets a Phase 1 budget of $15-30K with 2-3 people and has kill criteria at 6 months. A monorepo adds unnecessary overhead to this timeline.

3. **Healthcare needs compliance rigor.** HIPAA requirements demand careful, methodical development. Coupling it with a fast-moving consumer app creates friction in both directions.

4. **The shared code benefit is small.** Auth setup, UI components, and utility functions represent days of work, not weeks. The overhead of maintaining shared packages in a monorepo can exceed the time saved.

5. **Merging later is cheap.** The cost of adding "Sign in with AllGuds" as a shared OAuth provider later is approximately 2-3 days of integration work. The cost of over-engineering a monorepo now that slows down the LPG MVP is significantly higher.

### Recommended Approach

| Step | Action |
|------|--------|
| **Now** | Build the LPG app as a standalone application. Ship it. Validate the business model. |
| **When ready** | Build the Healthcare app as a standalone application with HIPAA compliance from day one. |
| **If user overlap emerges** | Add a shared OAuth provider ("Sign in with AllGuds") as a lightweight integration. |
| **If code duplication becomes painful** | Extract a shared component library after both apps exist and common patterns are clear. |

### Key Principle

> The cost of merging two working apps later is small. The cost of over-engineering a shared platform now that slows down MVP validation is high. Build separate. Move fast. Merge what makes sense when you have real data.

---

## Decision Summary

| Question | Answer |
|----------|--------|
| Should both apps share a parent app? | **No** — not at this stage |
| Should they share authentication? | **Not now** — add shared OAuth later if user overlap is confirmed |
| Should they share a monorepo? | **Not now** — adds complexity without proportional benefit |
| Should they use the same tech stack? | **Yes** — makes future integration easier if needed |
| Should they share branding/design system? | **Yes** — via a shared Figma design system, not a code dependency |
| Is it a HIPAA risk to share auth? | **Manageable** if done correctly (identity-only IdP), but unnecessary risk at this stage |

---

*Document created: 2026-02-16*
*Status: Recommendation — pending team review*
