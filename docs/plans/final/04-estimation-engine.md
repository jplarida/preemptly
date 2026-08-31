# Session 04 — Estimation Engine & Eval Harness

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Depends on:** 01 (kernel).
> The core IP. Small, self-contained session — can run in parallel with 02/03.

## Goal

Move the estimation engine into the vertical-agnostic **`core-domain/prediction`** capability, refactored behind a **`ConsumptionModel` interface** so any vertical with a consumption/depletion concept reuses it (LPG registers the kg/day model as `pack-lpg`'s `ConsumptionModel`). Stand up a backtesting/eval harness on the **`prediction_log`** table (the core-domain generalization of the legacy `accuracyLog`, seeded with historical/synthetic data — legacy data is throwaway, GAP-01) so strategies can be measured and A/B'd safely before the module port depends on them. The pure math is unchanged — only its home and its rate-table injection change.

## Tasks

- [ ] Port `apps/api-elysia/src/modules/estimation/engine.ts` → **`packages/core-domain/prediction/engine.ts`**, refactored behind a **`ConsumptionModel` interface** (`rate(input) → perDay`, `calibrate(history) → correctionFactor`). The pure depletion math stays vertical-agnostic; the **kg/day `USAGE_PROFILES` + cooking `ADJUSTMENT_MULTIPLIERS` move into `pack-lpg` as its registered `ConsumptionModel`**. Bring `engine.test.ts` across (unchanged behavior).
- [ ] Keep the three-tier confidence model intact (LOW cold-start / MEDIUM calibrated / HIGH history-based) per `codebase-invariants` RULE-EST-01; do not hardcode preempty thresholds (RULE-EST-02).
- [ ] **Day boundaries in `APP_TZ` (GAP-21)** — cycle length, days-since-refill, and days-until-empty are computed on **Asia/Manila** calendar days, not naive UTC diffs (a refill at 03:00 PH = 19:00 UTC the prior day must bucket to the PH day). Keep the engine **pure**: inject a clock / pass PH-day-aligned values; the tz util lives in `shared/`. Add midnight-boundary cases to `engine.test.ts`.
- [ ] The stateful estimation *service* (DB-touching) is ported later with the `estimation`/`tanks` modules in session 05 — this session is the pure engine + eval only.
- [ ] **Eval/backtest harness** — use the **`prediction_log`** table (core-domain; generalizes the legacy `accuracyLog`): replay historical refills, compute predicted-vs-actual cycle error per tier, output accuracy metrics. Enables A/B of strategies.
- [ ] Expose the harness as a script/test (not a public route) so it runs offline in CI or on demand.

## Files (new)

`packages/core-domain/prediction/{engine.ts,consumption-model.ts,engine.test.ts}`,
`packages/core-domain/prediction/eval/{backtest.ts,backtest.test.ts}` (harness),
`packages/pack-lpg/prediction/lpg-model.ts` (the kg/day `ConsumptionModel`).

## Reuse

- `apps/api-elysia/src/modules/estimation/engine.ts` + `engine.test.ts` (verbatim).
- The predicted-vs-actual concept originates in the legacy `accuracyLog` (seen in test factories); in `api-core` it is generalized as **`prediction_log`** (added in session 01) — the harness reads that. `accuracyLog` is not carried forward as a separate table.

## Acceptance / verification

- Ported `engine.test.ts` passes unchanged (`bun test`).
- Backtest harness runs against seeded historical data and reports predicted-vs-actual error by confidence tier.
- No DB dependency in `engine.ts` (stays pure — verify no prisma import).
- `tsc -b` clean.

## Notes

- This protects the differentiator: instrument accuracy before the model grows. Later (Phase 2) a real model can sit behind the same interface + this harness.
