# ADR-0001 — Backend framework: Elysia on Bun

> **Status:** Accepted · **Date:** 2026-07-19 · **Coverage:** preempty:default
> Part of the PreEmptly API final plan. See `00-README-index.md`. First ADR — foundational decisions get recorded here so the rationale survives.

## Context

`api-core` is a **greenfield rebuild** of the existing backend, which already runs on **Elysia/Bun** (`apps/api-elysia`); a legacy NestJS app (`apps/api`) is being retired. The architecture is a **split-ready modular monolith** whose framework touches only the thin HTTP edge — services, repositories, the platform kernel (auth crypto, RBAC, policy/RLS, events/outbox, rate-limit, idempotency, audit), and the TypeBox schemas are framework-agnostic by design. Priorities: MVP velocity, end-to-end type safety, and a small team already fluent in Elysia/Bun. Deploy target is containerized Kubernetes (see `db-migration-runbook.md`).

## Decision

**Use Elysia on Bun, single-language TypeScript end-to-end** (see the *Language strategy* note in the final plan for the polyglot posture). Keep the framework **isolated to `*.routes.ts` + app composition** via `buildApp(deps)`/repository/bus/contract, so the core never depends on it.

## Alternatives considered

| Option | Pros | Why not (here) |
|---|---|---|
| **Hono** (Bun/Node/edge) | Runtime-portable (Node/Bun/Workers/Deno); has typed RPC (`hc`) | Lateral move — doesn't beat Elysia enough to justify switching + re-speccing; Eden is tighter with TypeBox. **Documented fallback** (below). |
| **Fastify** (Node) | Maximum production maturity; JSON-Schema-first fits TypeBox | Loses the Eden end-to-end-types story; heavier; abandons Bun velocity |
| **NestJS** (Node) | Enterprise DI, huge ecosystem | Already being **retired**; heavyweight/boilerplate vs the split-ready low-ceremony design |
| **Go / other language** | Performance/concurrency | Polyglot is a *later, per-service* option at a proven seam (Language-strategy note), not a whole-app choice now |

## Consequences

**Positive:** end-to-end type safety via **Eden Treaty** (API→web, zero codegen); **TypeBox** validation + **OpenAPI** generation from the same schemas; testable `app.handle()`; zero ramp cost (team already on it); Bun runtime speed.

**Negative / risks:** Bun-in-production and Elysia are **younger / less battle-tested** than the Node ecosystem; some **Bun coupling** (less runtime-portable than Hono); smaller plugin ecosystem.

**Mitigations:** the framework is confined to the HTTP edge, so the kernel/business logic/schemas are unaffected by it; the **split seams make it reversible per-service** — a single service can be extracted and re-framed/re-runtimed later (same mechanism as the polyglot strategy); Bun runs fine in the K8s containers already targeted.

## Fallback & revisit triggers

**Hono is the documented fallback.** Reconsider (migrating the HTTP edge — a **bounded** change, since core sessions are framework-agnostic) if any of:
- **Bun becomes a production liability** (stability, ops, a blocking bug).
- **Runtime portability is needed** — a real requirement to run on **Node** or deploy to the **edge/Cloudflare Workers**.
- **Elysia stalls** (maintenance/ecosystem) relative to Hono.

Because a switch touches only `*.routes.ts` + validation wiring + the typed client (Eden → Hono RPC) + OpenAPI (`@elysiajs/swagger` → `hono-openapi`), it stays cheap *as long as the framework-light discipline holds*. Doing it **now (greenfield) is cheap; after building, it's a real migration** — so if portability is ever a serious concern, decide early.

## Links

- Final plan → *Language strategy* note and *How the Split Works* (the seams that make this reversible).
- `core-vs-pack-decision-guide.md` (RULE-PACK-04 — the "build now vs wait for a proven seam" discipline, applied here to the framework).
