import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, createTestApp, makeRequest, mockRetailer, mockRider } from "../../test/helpers";
import { Elysia } from "elysia";
import { HttpError } from "../../lib/errors";
import { RegisterRetailerBody, UpdateRetailerBody, PricingBody, PreemptlyZoneBody, CreateRiderBody } from "./model";

function createRetailersPublicModule() {
  const { RetailersService } = require("./service");
  return new Elysia({ prefix: "/retailers" })
    .post("/register", async ({ body }: any) => {
      return RetailersService.register(body);
    }, { body: RegisterRetailerBody });
}

function createRetailersAuthModule() {
  const { RetailersService } = require("./service");
  return new Elysia({ prefix: "/retailers" })
    .get("/me", async ({ currentUser }: any) => {
      return RetailersService.getProfile(currentUser.id);
    })
    .patch("/me", async ({ currentUser, body }: any) => {
      return RetailersService.updateProfile(currentUser.id, body);
    }, { body: UpdateRetailerBody })
    .get("/me/dashboard", async ({ currentUser }: any) => {
      return RetailersService.getDashboard(currentUser.id);
    })
    .get("/me/customers", async ({ currentUser }: any) => {
      return RetailersService.getCustomersWithStatus(currentUser.id);
    })
    .get("/me/orders", async ({ currentUser, query }: any) => {
      return RetailersService.getOrders(currentUser.id, query.status);
    })
    .get("/me/invite-stats", async ({ currentUser }: any) => {
      return RetailersService.getInviteStats(currentUser.id);
    })
    .put("/me/pricing", async ({ currentUser, body }: any) => {
      return RetailersService.updatePricing(currentUser.id, body.prices);
    }, { body: PricingBody })
    .put("/me/preemptly-zone", async ({ currentUser, body }: any) => {
      return RetailersService.updatePreemptlyZone(currentUser.id, body.preemptlyZoneDays);
    }, { body: PreemptlyZoneBody })
    .get("/me/riders", async ({ currentUser }: any) => {
      return RetailersService.getRiders(currentUser.id);
    })
    .post("/me/riders", async ({ currentUser, body }: any) => {
      return RetailersService.createRider(currentUser.id, body);
    }, { body: CreateRiderBody })
    .delete("/me/riders/:id", async ({ currentUser, params }: any) => {
      return RetailersService.removeRider(currentUser.id, params.id);
    });
}

function createPublicApp() {
  return new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.status;
        return { statusCode: error.status, message: error.message, timestamp: new Date().toISOString() };
      }
      const status = (error as any).status ?? 500;
      set.status = status;
      return { statusCode: status, message: "Internal Server Error", timestamp: new Date().toISOString() };
    })
    .use(createRetailersPublicModule());
}

describe("retailers module", () => {
  beforeEach(() => resetMocks());

  it("POST /retailers/register → 200 creates retailer with invite code", async () => {
    (mockPrisma.retailer.findUnique as any).mockResolvedValue(null);
    (mockPrisma.retailer.create as any).mockResolvedValue(mockRetailer);
    const app = createPublicApp();
    const res = await makeRequest(app, "POST", "/retailers/register", {
      businessName: "Gas Store",
      ownerName: "Owner",
      phone: "+639170000002",
      address: "123 Main St",
      city: "Manila",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inviteCode).toBeDefined();
  });

  it("POST /retailers/register → 409 duplicate phone", async () => {
    (mockPrisma.retailer.findUnique as any).mockResolvedValue(mockRetailer);
    const app = createPublicApp();
    const res = await makeRequest(app, "POST", "/retailers/register", {
      businessName: "Gas Store",
      ownerName: "Owner",
      phone: "+639170000002",
      address: "123 Main St",
      city: "Manila",
    });
    expect(res.status).toBe(409);
  });

  it("GET /retailers/me → 200 returns profile", async () => {
    (mockPrisma.retailer.findUnique as any).mockResolvedValue(mockRetailer);
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "GET", "/retailers/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.businessName).toBe("Gas Store");
  });

  it("PATCH /retailers/me → 200 updates profile", async () => {
    const updated = { ...mockRetailer, businessName: "Updated Store" };
    (mockPrisma.retailer.update as any).mockResolvedValue(updated);
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "PATCH", "/retailers/me", { businessName: "Updated Store" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.businessName).toBe("Updated Store");
  });

  it("GET /retailers/me/dashboard → 200 returns counts", async () => {
    (mockPrisma.customerRetailerLink.count as any).mockResolvedValue(5);
    (mockPrisma.order.count as any).mockResolvedValue(2);
    (mockPrisma.retailerSettings.findUnique as any).mockResolvedValue(null);
    (mockPrisma.customerRetailerLink.findMany as any).mockResolvedValue([]);
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "GET", "/retailers/me/dashboard");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customerCount).toBeDefined();
    expect(body.pendingOrders).toBeDefined();
  });

  it("GET /retailers/me/customers → 200 returns list", async () => {
    (mockPrisma.retailerSettings.findUnique as any).mockResolvedValue(null);
    (mockPrisma.customerRetailerLink.findMany as any).mockResolvedValue([]);
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "GET", "/retailers/me/customers");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /retailers/me/orders → 200 returns orders", async () => {
    (mockPrisma.order.findMany as any).mockResolvedValue([]);
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "GET", "/retailers/me/orders");
    expect(res.status).toBe(200);
  });

  it("GET /retailers/me/orders?status=PENDING → filtered", async () => {
    (mockPrisma.order.findMany as any).mockResolvedValue([]);
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "GET", "/retailers/me/orders?status=PENDING");
    expect(res.status).toBe(200);
  });

  it("GET /retailers/me/invite-stats → 200 returns stats", async () => {
    const statDate = new Date("2025-01-15");
    (mockPrisma.inviteStat.findMany as any).mockResolvedValue([
      { retailerId: "retailer-1", date: statDate, linkClicks: 10, joins: 3 },
    ]);
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "GET", "/retailers/me/invite-stats");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalClicks).toBe(10);
    expect(body.totalJoins).toBe(3);
  });

  it("PUT /retailers/me/pricing → 200 updates pricing", async () => {
    const prices = [{ capacityKg: 11, basePrice: 500 }];
    (mockPrisma.retailerSettings.upsert as any).mockResolvedValue({ pricing: prices });
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "PUT", "/retailers/me/pricing", { prices });
    expect(res.status).toBe(200);
  });

  it("PUT /retailers/me/preemptly-zone → 200 updates zone", async () => {
    (mockPrisma.retailerSettings.upsert as any).mockResolvedValue({ preemptlyZoneDays: 7 });
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "PUT", "/retailers/me/preemptly-zone", { preemptlyZoneDays: 7 });
    expect(res.status).toBe(200);
  });

  it("GET /retailers/me/riders → 200 returns list", async () => {
    (mockPrisma.rider.findMany as any).mockResolvedValue([mockRider]);
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "GET", "/retailers/me/riders");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
  });

  it("POST /retailers/me/riders → 200 creates rider", async () => {
    (mockPrisma.rider.create as any).mockResolvedValue(mockRider);
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "POST", "/retailers/me/riders", { name: "Rider", phone: "+639170000003" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Test Rider");
  });

  it("DELETE /retailers/me/riders/:id → 200 soft deletes rider", async () => {
    (mockPrisma.rider.findUnique as any).mockResolvedValue(mockRider);
    (mockPrisma.rider.update as any).mockResolvedValue({ ...mockRider, isActive: false });
    const app = createTestApp(createRetailersAuthModule(), "retailer");
    const res = await makeRequest(app, "DELETE", "/retailers/me/riders/rider-1");
    expect(res.status).toBe(200);
  });
});
