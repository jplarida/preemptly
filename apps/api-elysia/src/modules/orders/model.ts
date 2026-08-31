import { t } from "elysia";

export const INTERNAL_ORDER_STATUSES = [
  "PENDING",
  "PENDING_SMS",
  "CONFIRMED",
  "ASSIGNED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_RETAILER",
  "REJECTED",
] as const;

// Customer-friendly labels
export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Order Placed",
  PENDING_SMS: "Order Placed",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Confirmed",
  OUT_FOR_DELIVERY: "On the Way",
  DELIVERED: "Delivered",
  CANCELLED_BY_CUSTOMER: "Cancelled",
  CANCELLED_BY_RETAILER: "Cancelled by Retailer",
  REJECTED: "Rejected",
};

// Retailer-friendly labels
export const RETAILER_STATUS_LABELS: Record<string, string> = {
  PENDING: "New Order",
  PENDING_SMS: "SMS Order",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned to Rider",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED_BY_CUSTOMER: "Cancelled by Customer",
  CANCELLED_BY_RETAILER: "Cancelled",
  REJECTED: "Rejected",
};

export const CreateOrderBody = t.Object({
  tankId: t.String(),
  retailerId: t.String(),
  note: t.Optional(t.String()),
  capacityKg: t.Optional(t.Number()),
  deliveryAddress: t.Optional(t.String()),
});

export const ManualOrderBody = t.Object({
  customerPhone: t.String(),
  capacityKg: t.Number(),
  note: t.Optional(t.String()),
  source: t.Optional(t.Union([t.Literal("SMS"), t.Literal("CALL"), t.Literal("WALK_IN")])),
});

export const RejectOrderBody = t.Object({
  reason: t.String({ minLength: 1 }),
});

export const AssignRiderBody = t.Object({
  riderId: t.String(),
});

export const OverrideDiscountBody = t.Object({
  discountAmount: t.Number({ minimum: 0 }),
});
