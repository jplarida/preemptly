import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, createTestApp, makeRequest, mockOrder, mockTank, mockLocation, mockUser, mockRetailer, mockRider } from "../../test/helpers";
import { Elysia } from "elysia";
import { CreateOrderBody, ManualOrderBody, RejectOrderBody, AssignRiderBody, OverrideDiscountBody } from "./model";

function createOrdersTestModule(role: "user" | "retailer" = "user") {
  const { OrdersService } = require("./service");
  return new Elysia({ prefix: "/orders" })
    .post("/", async ({ currentUser, body }: any) => {
      return OrdersService.create(currentUser.id, body);
    }, { body: CreateOrderBody })
    .get("/", async ({ currentUser, query }: any) => {
      if (currentUser.role === "retailer") {
        return OrdersService.findByRetailer(currentUser.id, query.status);
      }
      return OrdersService.findByCustomer(currentUser.id);
    })
    .get("/:id", async ({ params }: any) => {
      return OrdersService.findOne(params.id);
    })
    .patch("/:id/cancel", async ({ currentUser, params }: any) => {
      return OrdersService.cancelByCustomer(params.id, currentUser.id);
    })
    .patch("/:id/confirm", async ({ currentUser, params }: any) => {
      return OrdersService.confirm(params.id, currentUser.id);
    })
    .patch("/:id/reject", async ({ currentUser, params, body }: any) => {
      return OrdersService.reject(params.id, currentUser.id, body.reason);
    }, { body: RejectOrderBody })
    .patch("/:id/assign", async ({ currentUser, params, body }: any) => {
      return OrdersService.assignRider(params.id, currentUser.id, body.riderId);
    }, { body: AssignRiderBody })
    .patch("/:id/discount", async ({ currentUser, params, body }: any) => {
      return OrdersService.overrideDiscount(params.id, currentUser.id, body.discountAmount);
    }, { body: OverrideDiscountBody })
    .post("/manual", async ({ currentUser, body }: any) => {
      return OrdersService.createManual(currentUser.id, body);
    }, { body: ManualOrderBody });
}

const orderWithIncludes = {
  ...mockOrder,
  tank: mockTank,
  customer: mockUser,
  retailer: mockRetailer,
};

describe("orders module", () => {
  beforeEach(() => resetMocks());

  it("POST /orders → 200 creates order with locked discount", async () => {
    (mockPrisma.customerRetailerLink.findUnique as any).mockResolvedValue({
      id: "link-1", customerId: "user-1", retailerId: "retailer-1", status: "ACTIVE",
    });
    (mockPrisma.tank.findUnique as any).mockResolvedValue({ ...mockTank, location: mockLocation });
    (mockPrisma.retailerSettings.findUnique as any).mockResolvedValue({
      retailerId: "retailer-1",
      pricing: [{ capacityKg: 11, basePrice: 500 }],
      discountTiers: [{ daysBeforeEmpty: 5, discountAmount: 50 }],
      preemptlyZoneDays: 5,
      discountsEnabled: true,
    });
    (mockPrisma.order.create as any).mockResolvedValue(orderWithIncludes);
    const app = createTestApp(createOrdersTestModule());
    const res = await makeRequest(app, "POST", "/orders", {
      tankId: "tank-1",
      retailerId: "retailer-1",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("order-1");
  });

  it("POST /orders → 400 no active link", async () => {
    (mockPrisma.customerRetailerLink.findUnique as any).mockResolvedValue(null);
    const app = createTestApp(createOrdersTestModule());
    const res = await makeRequest(app, "POST", "/orders", {
      tankId: "tank-1",
      retailerId: "retailer-1",
    });
    expect(res.status).toBe(400);
  });

  it("GET /orders as customer → orders with customer labels", async () => {
    (mockPrisma.order.findMany as any).mockResolvedValue([
      { ...mockOrder, tank: mockTank, retailer: mockRetailer },
    ]);
    const app = createTestApp(createOrdersTestModule());
    const res = await makeRequest(app, "GET", "/orders");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].statusLabel).toBe("Order Placed");
  });

  it("GET /orders as retailer → orders with retailer labels", async () => {
    (mockPrisma.order.findMany as any).mockResolvedValue([
      { ...mockOrder, tank: mockTank, customer: mockUser },
    ]);
    const app = createTestApp(createOrdersTestModule("retailer"), "retailer");
    const res = await makeRequest(app, "GET", "/orders");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].statusLabel).toBe("New Order");
  });

  it("GET /orders/:id → 200 returns order detail", async () => {
    (mockPrisma.order.findUnique as any).mockResolvedValue(orderWithIncludes);
    const app = createTestApp(createOrdersTestModule());
    const res = await makeRequest(app, "GET", "/orders/order-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("order-1");
  });

  it("PATCH /orders/:id/cancel → 200 cancels order", async () => {
    (mockPrisma.order.findUnique as any).mockResolvedValue(mockOrder);
    (mockPrisma.order.update as any).mockResolvedValue({
      ...mockOrder, status: "CANCELLED_BY_CUSTOMER", retailer: mockRetailer,
    });
    const app = createTestApp(createOrdersTestModule());
    const res = await makeRequest(app, "PATCH", "/orders/order-1/cancel");
    expect(res.status).toBe(200);
  });

  it("PATCH /orders/:id/cancel → 400 too late (DELIVERED)", async () => {
    (mockPrisma.order.findUnique as any).mockResolvedValue({ ...mockOrder, status: "DELIVERED" });
    const app = createTestApp(createOrdersTestModule());
    const res = await makeRequest(app, "PATCH", "/orders/order-1/cancel");
    expect(res.status).toBe(400);
  });

  it("PATCH /orders/:id/confirm → 200 confirms order", async () => {
    const pendingOrder = { ...mockOrder, retailerId: "retailer-1" };
    (mockPrisma.order.findUnique as any).mockResolvedValue(pendingOrder);
    (mockPrisma.order.update as any).mockResolvedValue({
      ...pendingOrder, status: "CONFIRMED", retailer: mockRetailer,
    });
    const app = createTestApp(createOrdersTestModule("retailer"), "retailer");
    const res = await makeRequest(app, "PATCH", "/orders/order-1/confirm");
    expect(res.status).toBe(200);
  });

  it("PATCH /orders/:id/reject → 200 rejects with reason", async () => {
    const pendingOrder = { ...mockOrder, retailerId: "retailer-1" };
    (mockPrisma.order.findUnique as any).mockResolvedValue(pendingOrder);
    (mockPrisma.order.update as any).mockResolvedValue({
      ...pendingOrder, status: "REJECTED", note: "Out of stock", retailer: mockRetailer,
    });
    const app = createTestApp(createOrdersTestModule("retailer"), "retailer");
    const res = await makeRequest(app, "PATCH", "/orders/order-1/reject", { reason: "Out of stock" });
    expect(res.status).toBe(200);
  });

  it("PATCH /orders/:id/assign → 200 assigns rider", async () => {
    const confirmedOrder = { ...mockOrder, status: "CONFIRMED", retailerId: "retailer-1" };
    (mockPrisma.order.findUnique as any).mockResolvedValue(confirmedOrder);
    (mockPrisma.rider.findUnique as any).mockResolvedValue(mockRider);
    (mockPrisma.order.update as any).mockResolvedValue({
      ...confirmedOrder, status: "ASSIGNED", riderId: "rider-1", rider: mockRider,
    });
    const app = createTestApp(createOrdersTestModule("retailer"), "retailer");
    const res = await makeRequest(app, "PATCH", "/orders/order-1/assign", { riderId: "rider-1" });
    expect(res.status).toBe(200);
  });

  it("PATCH /orders/:id/discount → 200 overrides discount", async () => {
    (mockPrisma.order.findUnique as any).mockResolvedValue({ ...mockOrder, retailerId: "retailer-1" });
    (mockPrisma.order.update as any).mockResolvedValue({ ...mockOrder, discountAmount: 100, finalAmount: 400 });
    const app = createTestApp(createOrdersTestModule("retailer"), "retailer");
    const res = await makeRequest(app, "PATCH", "/orders/order-1/discount", { discountAmount: 100 });
    expect(res.status).toBe(200);
  });

  it("POST /orders/manual → 200 creates manual order", async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
    (mockPrisma.tank.findFirst as any).mockResolvedValue(mockTank);
    (mockPrisma.order.create as any).mockResolvedValue({
      ...mockOrder, status: "CONFIRMED", tank: mockTank, customer: mockUser,
    });
    const app = createTestApp(createOrdersTestModule("retailer"), "retailer");
    const res = await makeRequest(app, "POST", "/orders/manual", {
      customerPhone: "+639170000001",
      capacityKg: 11,
    });
    expect(res.status).toBe(200);
  });
});
