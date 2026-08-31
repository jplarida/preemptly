# Error Taxonomy

> Part of the PreEmptly API final plan. See `00-README-index.md`. The canonical error envelope + machine-readable code catalog. Client-facing contract; produced by `platform/http/error-handler.ts` (session 01, ported from `lib/errors.ts`). Pairs with `api-surface.md`.

## Principles

- **One envelope for every error** — clients parse uniformly.
- **Machine-readable `code` is the contract; `message` is developer-facing English** — the **client maps `code` → localized user copy** (never render the server `message` in the UI; ties to localization, see `notifications-comms-spec.md`).
- **Codes are a versioned contract (GAP-26)** — *adding* a code is additive; *removing/renaming/repurposing* one is breaking → new API version.
- **Every error carries `requestId`** (= correlationId, GAP-09) for tracing/support.
- **No PII / secrets in messages** (GAP-06; logging scrubs).

## Canonical envelope

```json
{
  "error": {
    "code": "FORBIDDEN_OWNERSHIP",
    "message": "Caller does not own this resource.",
    "status": 403,
    "requestId": "req_01HXYZ...",
    "details": [{ "field": "phone", "issue": "invalid_ph_number" }],
    "retryable": false
  }
}
```

- `details` present for validation (field-level). `retryable` guides client retry (429/503 = true; 4xx business = false).

## HTTP status usage

| Status | When |
|---|---|
| **400** | schema validation (TypeBox, `additionalProperties:false`) |
| **401** | unauthenticated — missing/invalid/expired token |
| **403** | authorization — role (RBAC) or object-policy/tenancy (the IDOR fix); entitlement (GAP-19) |
| **404** | resource not found *(see 404-vs-403 open decision)* |
| **409** | conflict — invalid state transition (GAP-02), idempotency-key reuse w/ different body, optimistic-concurrency |
| **422** | semantic/business validation beyond schema (e.g. invalid PH number, business rule) |
| **426** | app version below the min floor (GAP-04) |
| **429** | rate limited (GAP-23) — with `Retry-After` |
| **503** | circuit-breaker open / downstream down / graceful-shutdown draining |
| **500** | unhandled internal error |

## Error code catalog

**Auth** (`/v1/auth`)
| Code | Status | Meaning |
|---|---|---|
| `AUTH_OTP_INVALID` / `AUTH_OTP_EXPIRED` | 422 | wrong/expired OTP |
| `AUTH_OTP_COOLDOWN` | 429 | resend before cooldown (60s) |
| `AUTH_OTP_MAX_ATTEMPTS` | 429 | verify attempts exceeded → lockout |
| `AUTH_PHONE_INVALID` | 422 | not a valid PH mobile (libphonenumber) |
| `AUTH_CAPTCHA_REQUIRED` | 403 | CAPTCHA challenge after N attempts |
| `AUTH_TOKEN_EXPIRED` / `AUTH_TOKEN_REVOKED` | 401 | access token expired / token-version bumped |
| `AUTH_REFRESH_INVALID` | 401 | refresh token invalid/expired → re-auth |
| `AUTH_RECOVERY_INVALID` | 422/429 | bad recovery credential (rate-limited) (GAP-22) |

**AuthZ / tenancy** (GAP object-policy)
| Code | Status | Meaning |
|---|---|---|
| `FORBIDDEN_ROLE` | 403 | wrong role for endpoint |
| `FORBIDDEN_OWNERSHIP` | 403 | not the owner (consumer object-policy) |
| `FORBIDDEN_TENANT` | 403 | not the provider tenant |
| `NOT_LINKED` | 403 | no ACTIVE consumer↔provider link |
| `VERTICAL_NOT_ENTITLED` | 403 | tenant not entitled to the vertical (GAP-19) |

**Validation**
| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | schema validation (with `details[]`) |
| `UNKNOWN_FIELD` | 400 | `additionalProperties` violation |
| `ATTRIBUTES_INVALID` | 400 | polymorphic `attributes` fail the pack type schema |

**Resource / concurrency**
| Code | Status | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | resource missing |
| `CONFLICT_STATE` | 409 | invalid lifecycle transition (GAP-02) |
| `IDEMPOTENCY_KEY_REUSED` | 409 | same `Idempotency-Key`, different body |
| `CONCURRENCY_CONFLICT` | 409 | stale update (optimistic concurrency) |

**Platform**
| Code | Status | Meaning |
|---|---|---|
| `RATE_LIMITED` | 429 | + `Retry-After`; replay burst carve-out applies (GAP-23) |
| `APP_VERSION_UNSUPPORTED` | 426 | below min floor (GAP-04) |
| `SERVICE_UNAVAILABLE` | 503 | circuit-breaker open / draining |
| `INTERNAL` | 500 | unhandled — generic message, details in logs only |

> **Idempotency success is not an error:** replaying the *same* key + body returns the **stored original response** (GAP-02), not a 409. Only a key reuse with a *different* body is `IDEMPOTENCY_KEY_REUSED`.

## Conventions

- **Deprecated endpoints** add `Deprecation`/`Sunset` headers (GAP-26) — not an error, but the same response may carry them.
- **Retry guidance:** `retryable:true` for 429/503 (respect `Retry-After` / backoff); never blind-retry a 409.
- **Rate-limit** responses include `Retry-After`; legitimate offline replay is carved out (GAP-23).
- **Consistency:** all thrown errors extend a single `HttpError(code, status, message, details?)`; `onError` renders the envelope + attaches `requestId`.

## Where it lands

- `platform/http/error-handler.ts` (session 01) — the `HttpError` type + `onError` renderer + `requestId` attach.
- Auth/authz codes (session 02); domain/resource codes per module (session 05); entitlement (GAP-19); version-gate (01).
- Referenced by every endpoint in `api-surface.md`.

## Verification (hooked into 06)

- Every error response uses the envelope + carries `requestId`; no PII in messages.
- Validation returns `details[]` with field + issue.
- IDOR → `403 FORBIDDEN_OWNERSHIP`; wrong role → `403 FORBIDDEN_ROLE`; invalid transition → `409 CONFLICT_STATE`; over-limit → `429` + `Retry-After`; old app → `426`.
- Duplicate `Idempotency-Key` (same body) → stored response (200), not 409; different body → `409 IDEMPOTENCY_KEY_REUSED`.

## Open decisions

- **404 vs 403 for object-policy** — return `403 FORBIDDEN_OWNERSHIP` (current sessions 02/05) vs `404 NOT_FOUND` to avoid leaking existence. Pick one convention.
- **Entitlement status** — `403 VERTICAL_NOT_ENTITLED` vs `402 Payment Required` (billing context).
- Whether to expose a stable **`docsUrl`** per code for client devs.
