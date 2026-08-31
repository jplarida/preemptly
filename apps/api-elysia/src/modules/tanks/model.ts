import { t } from "elysia";

export const CreateTankBody = t.Object({
  locationId: t.String(),
  capacityKg: t.Number(),
  unit: t.Optional(t.String()),
  model: t.Union([t.Literal("EXCHANGE"), t.Literal("REFILL")]),
  usageLevel: t.Union([
    t.Literal("LIGHT"),
    t.Literal("MODERATE"),
    t.Literal("HEAVY"),
    t.Literal("VERY_HEAVY"),
  ]),
});

export const UpdateTankBody = t.Object({
  capacityKg: t.Optional(t.Number()),
  unit: t.Optional(t.String()),
  model: t.Optional(t.Union([t.Literal("EXCHANGE"), t.Literal("REFILL")])),
  usageLevel: t.Optional(
    t.Union([
      t.Literal("LIGHT"),
      t.Literal("MODERATE"),
      t.Literal("HEAVY"),
      t.Literal("VERY_HEAVY"),
    ]),
  ),
  isActive: t.Optional(t.Boolean()),
});

export const AdjustTankBody = t.Object({
  adjustment: t.Union([
    t.Literal("COOKED_MORE"),
    t.Literal("COOKED_LESS"),
    t.Literal("NORMAL"),
  ]),
});
