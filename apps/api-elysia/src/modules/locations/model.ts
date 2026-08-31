import { t } from "elysia";

export const CreateLocationBody = t.Object({
  address: t.String({ minLength: 1 }),
  type: t.Optional(t.Union([t.Literal("HOME"), t.Literal("BUSINESS")])),
  timezone: t.Optional(t.String()),
});

export const UpdateLocationBody = t.Object({
  address: t.Optional(t.String()),
  type: t.Optional(t.Union([t.Literal("HOME"), t.Literal("BUSINESS")])),
  timezone: t.Optional(t.String()),
});
