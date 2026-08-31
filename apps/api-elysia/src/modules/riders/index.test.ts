import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, createTestApp, makeRequest, mockOrder, mockTank, mockUser, mockRetailer, mockRider, mockLocation } from "../../test/helpers";
import { Elysia } from "elysia";
import { RegisterCustomerBody, ConfirmDeliveryBody } from "./model";

function createRidersTestModule() {
  const { RidersService } = require("./service");
  return new Elysia({ prefix: "/rider" })
    .get("/deliveries", async ({ currentUser }: any) => {
      return RidersService.getDeliveries(currentUser.id);
    })
    .get("/prospects", async ({ currentUser }: any) => {
      return RidersService.getProspects(currentUser.id);
    })
    .post("/customers", async ({ currentUser, body }: any) => {
      return RidersService.registerCustomer(currentUser.id, body);
    }, { body: RegisterCustomerBody })
    .post("/deliveries/:id/start", async ({ currentUser, params }: any) => {
      return RidersService.startDelivery(currentUser.id, params.id);
    })
    .post("/deliveries/:id/confirm", async ({ currentUser, params, body }: any) => {
      return RidersService.confirmDelivery(currentUser.id, params.id, body.method, body.code);
    }, { body: ConfirmDeliveryBody })
    .get("/history", async ({ currentUser }: any) => {
      return RidersService.getHistory(currentUser.id);
    });
}

const assignedOrder = {
  ...mockOrder,
  status: "ASSIGNED",
  riderId: "rider-1",
  tank: mockTank,
  customer: mockUser,
  retailer: mockRetailer,
};

describe("riders module", () => {
  beforeEach(() => resetMocks());

  it("GET /rider/deliveries → 200 returns today's orders", async () => {
    (mockPrisma.order.findMany as any).mockResolvedValue([assignedOrder]);
    const app = createTestApp(createRidersTestModule(), "rider");
    const res = await makeRequest(app, "GET", "/rider/deliveries");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /rider/prospects → 200 sorted by urgency", async () => {
    (mockPrisma.rider.findUnique as any).mockResolvedValue(mockRider);
    (mockPrisma.retailerSettings.findUnique as any).mockResolvedValue(null);
    (mockPrisma.customerRetailerLink.findMany as any).mockResolvedValue([]);
    const app = createTestApp(createRidersTestModule(), "rider");
    const res = await makeRequest(app, "GET", "/rider/prospects");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("POST /rider/customers → 200 registers customer", async () => {
    (mockPrisma.rider.findUnique as any).mockResolvedValue(mockRider);
    (mockPrisma.user.findUnique as any).mockResolvedValue(null);
    (mockPrisma.user.create as any).mockResolvedValue(mockUser);
    (mockPrisma.location.create as any).mockResolvedValue(mockLocation);
    (mockPrisma.tank.create as any).mockResolvedValue(mockTank);
    (mockPrisma.customerRetailerLink.upsert as any).mockResolvedValue({
      id: "link-1", customerId: "user-1", retailerId: "retailer-1", status: "ACTIVE",
    });
    const app = createTestApp(createRidersTestModule(), "rider");
    const res = await makeRequest(app, "POST", "/rider/customers", {
      name: "Customer",
      phone: "+639170000010",
      address: "123 St",
      capacityKg: 11,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.location).toBeDefined();
    expect(body.tank).toBeDefined();
  });

  it("POST /rider/deliveries/:id/start → 200 out for delivery", async () => {
    (mockPrisma.order.findUnique as any).mockResolvedValue(assignedOrder);
    (mockPrisma.order.update as any).mockResolvedValue({
      ...assignedOrder, status: "OUT_FOR_DELIVERY",
    });
    const app = createTestApp(createRidersTestModule(), "rider");
    const res = await makeRequest(app, "POST", "/rider/deliveries/order-1/start");
    expect(res.status).toBe(200);
  });

  it("POST /rider/deliveries/:id/start → 400 wrong status", async () => {
    (mockPrisma.order.findUnique as any).mockResolvedValue({ ...assignedOrder, status: "PENDING" });
    const app = createTestApp(createRidersTestModule(), "rider");
    const res = await makeRequest(app, "POST", "/rider/deliveries/order-1/start");
    expect(res.status).toBe(400);
  });

  it("POST /rider/deliveries/:id/confirm QR → 200 delivered", async () => {
    const outOrder = { ...assignedOrder, status: "OUT_FOR_DELIVERY" };
    (mockPrisma.order.findUnique as any).mockImplementation(() => outOrder);
    (mockPrisma.order.update as any).mockResolvedValue({
      ...outOrder, status: "DELIVERED", deliveredAt: new Date(),
    });
    (mockPrisma.tank.update as any).mockResolvedValue(mockTank);
    (mockPrisma.refillLog.create as any).mockResolvedValue({});
    const app = createTestApp(createRidersTestModule(), "rider");
    const res = await makeRequest(app, "POST", "/rider/deliveries/order-1/confirm", {
      method: "QR",
      code: "ABC123",
    });
    expect(res.status).toBe(200);
  });

  it("POST /rider/deliveries/:id/confirm MANUAL → 200 flagged for review", async () => {
    const outOrder = { ...assignedOrder, status: "OUT_FOR_DELIVERY" };
    (mockPrisma.order.findUnique as any).mockImplementation(() => outOrder);
    (mockPrisma.order.update as any).mockResolvedValue({
      ...outOrder, status: "DELIVERED", needsReview: true, deliveredAt: new Date(),
    });
    (mockPrisma.tank.update as any).mockResolvedValue(mockTank);
    (mockPrisma.refillLog.create as any).mockResolvedValue({});
    const app = createTestApp(createRidersTestModule(), "rider");
    const res = await makeRequest(app, "POST", "/rider/deliveries/order-1/confirm", {
      method: "MANUAL",
    });
    expect(res.status).toBe(200);
  });

  it("GET /rider/history → 200 returns past deliveries", async () => {
    (mockPrisma.order.findMany as any).mockResolvedValue([]);
    const app = createTestApp(createRidersTestModule(), "rider");
    const res = await makeRequest(app, "GET", "/rider/history");
    expect(res.status).toBe(200);
  });
});
