import { t } from "elysia";

export const RegisterCustomerBody = t.Object({
  name: t.String({ minLength: 1 }),
  phone: t.String({ minLength: 1 }),
  address: t.String({ minLength: 1 }),
  locationType: t.Optional(t.Union([t.Literal("HOME"), t.Literal("BUSINESS")])),
  capacityKg: t.Number(),
  usageLevel: t.Optional(
    t.Union([
      t.Literal("LIGHT"),
      t.Literal("MODERATE"),
      t.Literal("HEAVY"),
      t.Literal("VERY_HEAVY"),
    ]),
  ),
});

export const ConfirmDeliveryBody = t.Object({
  method: t.Union([t.Literal("QR"), t.Literal("CODE"), t.Literal("MANUAL")]),
  code: t.Optional(t.String()),
});
