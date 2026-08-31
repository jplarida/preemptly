import { t } from "elysia";

export const DiscountTier = t.Object({
  daysBeforeEmpty: t.Number({ minimum: 0 }),
  discountAmount: t.Number({ minimum: 0 }),
});

export const UpdateTiersBody = t.Object({
  tiers: t.Array(DiscountTier),
});

export const ToggleDiscountsBody = t.Object({
  enabled: t.Boolean(),
});

export const DEFAULT_DISCOUNT_TIERS = [
  { daysBeforeEmpty: 5, discountAmount: 50 },
  { daysBeforeEmpty: 4, discountAmount: 40 },
  { daysBeforeEmpty: 3, discountAmount: 30 },
  { daysBeforeEmpty: 2, discountAmount: 20 },
  { daysBeforeEmpty: 1, discountAmount: 10 },
  { daysBeforeEmpty: 0, discountAmount: 0 },
];

export const DEFAULT_PREEMPTLY_ZONE_DAYS = 5;
