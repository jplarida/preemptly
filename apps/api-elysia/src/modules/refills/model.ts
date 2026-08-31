import { t } from "elysia";

export const LogRefillBody = t.Object({
  tankId: t.String(),
  refillDate: t.Optional(t.String()),
  confirmOutlier: t.Optional(t.Boolean()),
});
