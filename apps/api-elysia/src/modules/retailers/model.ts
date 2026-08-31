import { t } from "elysia";

export const RegisterRetailerBody = t.Object({
  businessName: t.String({ minLength: 1 }),
  ownerName: t.String({ minLength: 1 }),
  phone: t.String({ minLength: 1 }),
  address: t.String({ minLength: 1 }),
  city: t.String({ minLength: 1 }),
});

export const UpdateRetailerBody = t.Object({
  businessName: t.Optional(t.String()),
  ownerName: t.Optional(t.String()),
  address: t.Optional(t.String()),
  city: t.Optional(t.String()),
});

export const PricingBody = t.Object({
  prices: t.Array(
    t.Object({
      capacityKg: t.Number(),
      basePrice: t.Number({ minimum: 0 }),
    }),
  ),
});

export const PreemptlyZoneBody = t.Object({
  preemptlyZoneDays: t.Number({ minimum: 1, maximum: 10 }),
});

export const CreateRiderBody = t.Object({
  name: t.String({ minLength: 1 }),
  phone: t.String({ minLength: 1 }),
});
