# Notifications & Comms Spec

> Part of the PreEmptly API final plan. See `00-README-index.md`. Consolidates the notification/comms contract scattered across sessions 05 (notifications module) + 07 (comms redundancy/n8n) and GAP-05 (edge-trigger) / GAP-10 (DeviceToken) / GAP-15 (generic events + pack templates) / GAP-25 (idempotent handlers) / GAP-06 (consent/erasure). **Scope: core delivery engine + Phase-1 LPG catalog**; pack-specific templates are pack-provided.
> The **preempty low-gas alert is the product's differentiator** — this spec makes it precise.

## Principles

- **Event-driven** — notifications react to bus events via the **outbox** (at-least-once); **every handler is idempotent, dedup on event id** (GAP-25) so a redelivery = one notification.
- **Core = delivery engine; packs decide *what* notifies + provide *templates*** (GAP-15, `DomainPack.notificationTemplates`). Notifications subscribes to the **generic** `ServiceRequest*` events and picks the pack template per `(vertical, type, channel, locale)`.
- **Off the critical path** — a down channel never blocks orders/deliveries; delivery may move to **n8n** (07).
- **Transactional vs marketing** — transactional (order/delivery/preempty/OTP) can't be disabled; marketing (nudges) is **opt-out** (RA 10173, consent).

## Notification catalog (Phase-1 LPG)

| Notification | Trigger | Channels | Class | Audience |
|---|---|---|---|---|
| **Preempty low-gas alert** | `TankEnteredPreemptyZone` (pack, **edge-triggered** GAP-05) | Push → **SMS fallback** | transactional | consumer |
| Order placed | `ServiceRequestCreated`(lpg/refill) | Push | transactional | provider |
| Order confirmed / assigned / out-for-delivery / delivered | `ServiceRequestStatusChanged` | Push (+ SMS on `delivered`) | transactional | consumer |
| Refill logged | `RefillLogged` (pack) | Push | transactional | consumer |
| Reorder nudge | scheduled (post-refill cadence) | Push | **marketing** (opt-out) | consumer |
| OTP | `send-otp` (auth) | **SMS** (Semaphore) | transactional | consumer/provider |

> OTP is auth, not a "notification", but shares the comms/provider layer below. The **offline `PENDING_SMS` order** (RULE-OFFLINE-01) is a *consumer→retailer* SMS composed on-device — **distinct** from server-sent notifications.

## Channels & routing

- **Channels:** **Push (FCM)** · **SMS (Semaphore + fallback)** · **In-app** (a `Notification` record, `GET /v1/notifications`) · **Email** (later, when retailer email lands).
- **Routing:** prefer **push** (free, rich). **Fall back to SMS** for **high-value transactional** (preempty alert, `delivered`) when there's no valid device token / push fails. **Always write the in-app record** so it appears in the app's list regardless of channel.
- **Cost control:** SMS has cost — **push-first**, SMS only for high-value + fallback; honor the Semaphore **spend cap + alert** (session 02).

## User preferences / opt-out

- **Per-class (and optionally per-type) toggles**; **transactional cannot be fully disabled**, **marketing is opt-out**.
- **Quiet hours** (Asia/Manila, GAP-21) — defer non-urgent; an **urgent** allowlist (e.g. `delivered`) may override.
- **Consent** (session 08) gates marketing; opt-out honored immediately.
- **Erasure** (GAP-06) deletes device tokens + purges preferences.
- Stored in a `NotificationPreference` (per user) + `locale` on the profile.

## Delivery guarantees & reliability

- **At-least-once via outbox** (03) + **idempotent handler** (dedup on event id, GAP-25).
- **Retry + DLQ** via the **BullMQ seam** (03/07); **circuit breaker + timeout** around FCM/Semaphore (03 resilience).
- **Fallback:** push failure → SMS for high-value transactional; log every failure.
- **Multi-device** (GAP-10): send to all valid device tokens; **prune** tokens FCM reports unregistered.
- **Never blocks** the triggering flow.

## Dedup & timing

- **Preempty alert edge-triggered (GAP-05):** one alert per **zone entry**, not per scan; reset the flag on refill-out-of-zone; respect quiet hours.
- **Per-`(user, type, subject)` dedup window** — no two "out for delivery" for the same order.
- **Reorder nudge** rate-limited to a sane cadence.

## Templates & localization

- **Pack-provided templates** (GAP-15) keyed by `(vertical, type, channel, locale)`; safe variable interpolation; **SMS length/segment limits** enforced.
- **Localization:** EN + Filipino for consumer-facing copy is the likely Phase-1 target — **this is where the deferred UI localization decision actually lands on the backend** (SMS/push copy per locale, user `locale` on profile). *Open — tie to the UI localization decision.*

## Provider integration & redundancy (comms layer)

- **SMS:** **Semaphore** primary (PH) → **Twilio/Vonage** fallback, behind the `smsSender`/`otpSender` abstraction (07); spend cap + alert (02).
- **Push:** **FCM**.
- **Email:** Resend/SES (later).
- **n8n (07):** delivery fan-out can move to n8n workflows off the critical path — the API emits the event; n8n delivers. HMAC + `service` role (GAP-09).

## API / data touchpoints

- `GET /v1/notifications`, `POST /v1/notifications/:id/read`, `POST /v1/device-tokens`, `DELETE /v1/device-tokens/:id` (in `api-surface.md`).
- **New:** `GET·PATCH /v1/me/notification-preferences` — add to `api-surface.md`.
- Data: `Notification`, `DeviceToken`, **`NotificationPreference`** (new), pack templates.

## Verification (hooked into 06)

- Preempty alert fires **once on zone entry** (edge, GAP-05), respects quiet hours, **falls back to SMS** if no push.
- A **redelivered event → single notification** (idempotent, GAP-25).
- **Marketing opt-out honored**; transactional not disableable.
- Push failure → SMS fallback for high-value; **in-app record always written**.
- Erasure removes tokens + preferences.

## Open decisions

- **Locale set** — EN only vs **EN + Filipino** (ties to the deferred UI localization decision).
- Which transactional notifications also go **SMS** (cost) vs push-only.
- **Quiet-hours** defaults + the urgent-override allowlist.
- Preference **granularity** — per-class vs per-type.
- **n8n at launch** vs API-native delivery.
