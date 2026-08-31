# Merged notes — review queue (promoted from `_inbox/`)

> Append-only. Each block = one coverage’s staged notes, promoted by `merge-notes.js`.
> **Review periodically and fold the keepers into the proper domain memory files + `INDEX.md`,** then trim here.
> NOT registered in INDEX.md on purpose (this is staging, not canonical knowledge).


---

## 2026-06-30 13:25 · default

## 2026-06-29 — Rename preempty → preemptly (PAUSED, resume 2026-06-30)
Standardize-all-variants rename of the monorepo (`D:\Personal\projects\preempty`).
- DONE: 52 files renamed to `preemptly`/`PreEmptly`; mobile identity + bundle ids;
  `documents/preemptly/`; Kotlin pkg moved; Prisma client + `apps/api/dist` regenerated.
- DB = Option B (no DB ops): db name kept `preemplty`, `@map("preempty_zone_days")` kept,
  field is `preemptlyZoneDays`. App works. No commit made.
- PENDING: mobile build artifacts NOT regenerated — `flutter pub get` fails on a
  PRE-EXISTING Dart SDK mismatch (pubspec needs ^3.7.0, installed Flutter has 3.6.0).
  Fix Flutter/Dart ≥3.7.0 then `flutter pub get` to refresh `.dart_tool`/Generated.xcconfig.
- Full handoff: `.claude/sessions/2026-06-29-rename-preempty-to-preemptly.md`


---

## 2026-07-16 10:42 · default

## 2026-07-04 · default — Backend switching (Node ↔ Elysia) reference created
Reference doc: `.claude/sessions/2026-07-04-backend-switching-node-vs-elysia.md` (in real repo `D:\Personal\projects\preempty`).
Covers: both backends bind :3000/api (drop-in swap); NestJS `apps/api` is missing `discounts` + `riders` modules vs Elysia (the "Node update"); web is env-switchable via `NEXT_PUBLIC_API_URL`; mobile base URL is HARDCODED in `api_constants.dart` and needs a `String.fromEnvironment('API_BASE_URL', …)` / `--dart-define` refactor to be switchable. Model A = same-port server swap; Model B = split PORT + point each client.
