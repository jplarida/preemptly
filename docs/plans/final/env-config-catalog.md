# Env / Config Catalog

> Part of the PreEmptly API final plan. See `00-README-index.md`. The complete environment-variable inventory — the source for session 01's **TypeBox-validated, fail-fast** `config/env.ts` and `.env.example`. **R** = required (prod) · **O** = optional · 🔒 = secret.

## Conventions

- **Fail-fast at boot** (session 01): every **R** var validated for presence + format/length; **no `"dev-secret"` fallback** — boot aborts on a missing/weak required value.
- **TypeBox-validated** env schema; typed access only (no raw `process.env` in modules).
- **Secrets** (🔒) injected via a secret manager in prod (Doppler/Infisical/Vault/**KMS**), never in the repo; `.env.example` documents every var with dummy values.
- **Crypto-shred keys live in a separate KMS** (GAP-08), not alongside the DB.

## Runtime

| Var | R/O | Default | Notes |
|---|---|---|---|
| `NODE_ENV` / `APP_ENV` | R | — | `development`\|`staging`\|`production` |
| `PORT` | O | `3000` | listen port |
| `APP_TZ` | O | `Asia/Manila` | day-math tz (GAP-21); constant unless multi-region |
| `LOG_LEVEL` | O | `info` | Pino |
| `API_PUBLIC_URL` | R | — | canonical base (for links/OpenAPI) |

## Database (Neon)

| Var | R/O | Notes |
|---|---|---|
| `DATABASE_URL` 🔒 | R | **pooled** conn (PgBouncer/Accelerate) for the app |
| `DIRECT_DATABASE_URL` 🔒 | R | **non-pooled** for `prisma migrate deploy` (GAP-03 migration Job) |
| `DATABASE_SERVICE_URL` 🔒 | R | `service`/`BYPASSRLS` conn for relay + internal jobs (tenancy) |

## Redis (Upstash)

| Var | R/O | Notes |
|---|---|---|
| `REDIS_URL` 🔒 | R | rate-limit / OTP / refresh fast-path / idempotency cache / locks (GAP-05 single-runner) |

## Auth / JWT (session 02, GAP-22)

| Var | R/O | Notes |
|---|---|---|
| `JWT_PRIVATE_KEY` 🔒 | R | asymmetric **EdDSA/RS256** signing key (PEM) |
| `JWT_PUBLIC_KEY` | R | verify key (JWKS-published) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | R | claims |
| `ACCESS_TOKEN_TTL` | O | `15m` — short-lived |
| `REFRESH_TOKEN_TTL` | R | **≥ offline window** (GAP-22): e.g. `30d`/`60d`/`90d` |
| `JWT_KEY_ID` | O | `kid` for rotation |

## OTP / SMS (session 02/07)

| Var | R/O | Notes |
|---|---|---|
| `SEMAPHORE_API_KEY` 🔒 | R | primary PH SMS |
| `SEMAPHORE_SENDER_NAME` | R | sender id |
| `SEMAPHORE_SPEND_CAP` | O | spend cap → alert (SMS-pump defense) |
| `OTP_RESEND_COOLDOWN_S` | O | `60` |
| `OTP_MAX_SENDS_PER_HOUR` | O | throttle |
| `OTP_MAX_VERIFY_ATTEMPTS` | O | → lockout |
| `TWILIO_*` / `VONAGE_*` 🔒 | O | fallback SMS provider (comms redundancy) |

## CAPTCHA (session 02)

| Var | R/O | Notes |
|---|---|---|
| `TURNSTILE_SECRET` **or** `HCAPTCHA_SECRET` 🔒 | O | challenge after N attempts (provider = open decision) |

## Push (FCM — notifications-comms-spec)

| Var | R/O | Notes |
|---|---|---|
| `FCM_PROJECT_ID` | R | |
| `FCM_CLIENT_EMAIL` | R | service account |
| `FCM_PRIVATE_KEY` 🔒 | R | service account key |

## CORS / clients

| Var | R/O | Notes |
|---|---|---|
| `WEB_URL` | R | retailer dashboard origin (CORS, credentials) |
| `MOBILE_DEEP_LINK_ORIGIN` | O | deep-link origin |
| `MIN_APP_VERSION_IOS` / `MIN_APP_VERSION_ANDROID` | O | version-gate floor (GAP-04; set near launch, 08) |

## Idempotency / rate-limit (GAP-02/23)

| Var | R/O | Notes |
|---|---|---|
| `IDEMPOTENCY_RETENTION_DAYS` | O | `30` — ≥ offline window (GAP-02) |
| `RATE_LIMIT_*` | O | tunables (most are code constants; see error-taxonomy/GAP-23) |

## Encryption / KMS (GAP-06/08)

| Var | R/O | Notes |
|---|---|---|
| `KMS_KEY_ID` / `KMS_ENDPOINT` 🔒 | R | per-user PII encryption keys (crypto-shred); **separate from DB** (GAP-08) |

## Observability (session 01, 07)

| Var | R/O | Notes |
|---|---|---|
| `SENTRY_DSN` 🔒 | O | error capture |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | O | traces/metrics (+ trace propagation, GAP-09) |
| `POSTHOG_KEY` 🔒 | O | product analytics / flags (session 07) |

## Billing (Phase-2 — session 10)

| Var | R/O | Notes |
|---|---|---|
| `PAYMENT_PROVIDER` | O | `paymongo`\|`xendit` |
| `PAYMENT_API_KEY` 🔒 | O | hosted checkout |
| `PAYMENT_WEBHOOK_SECRET` 🔒 | O | HMAC verify (GAP-09 pattern) |

## Internal / n8n (Phase-2 — session 07)

| Var | R/O | Notes |
|---|---|---|
| `N8N_WEBHOOK_HMAC_SECRET` 🔒 | O | outbound webhook signing |
| `SERVICE_JWT_*` 🔒 | O | service-role machine credential (GAP-09) |

## Verification (hooked into 01/06)

- Boot **aborts** with a clear error when any **R** var is unset or fails format/length (fail-fast proven, session 01).
- No secret appears in the repo; `.env.example` lists **every** var.
- `REFRESH_TOKEN_TTL` ≥ the offline window; `IDEMPOTENCY_RETENTION_DAYS` ≥ it too.

## Open decisions

- CAPTCHA provider (Turnstile vs hCaptcha).
- Which tunables are **env** vs **code constants** (OTP/rate-limit limits).
- `REFRESH_TOKEN_TTL` concrete value (30/60/90d) — with GAP-22.
- Per-platform min-app-version vs single floor.
- Secret-manager choice (Doppler/Infisical/Vault/KMS) — session 08.
