import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, createTestApp, makeRequest, mockRetailer } from "../../test/helpers";
import { Elysia } from "elysia";
import { UpdateTiersBody, ToggleDiscountsBody } from "./model";
import { DEFAULT_DISCOUNT_TIERS, DEFAULT_PREEMPTLY_ZONE_DAYS } from "./model";

function createDiscountsTestModule() {
  const { DiscountsService } = require("./service");
  return new Elysia({ prefix: "/discounts" })
    .get("/tiers", async ({ currentUser }: any) => {
      return DiscountsService.getRetailerTiers(currentUser.id);
    })
    .put("/tiers", async ({ currentUser, body }: any) => {
      return DiscountsService.updateRetailerTiers(currentUser.id, body.tiers);
    }, { body: UpdateTiersBody })
    .patch("/toggle", async ({ currentUser, body }: any) => {
      return DiscountsService.toggleDiscounts(currentUser.id, body.enabled);
    }, { body: ToggleDiscountsBody });
}

describe("discounts module", () => {
  beforeEach(() => resetMocks());

  it("GET /discounts/tiers → defaults when no settings", async () => {
    (mockPrisma.retailerSettings.findUnique as any).mockResolvedValue(null);
    const app = createTestApp(createDiscountsTestModule(), "retailer");
    const res = await makeRequest(app, "GET", "/discounts/tiers");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tiers).toEqual(DEFAULT_DISCOUNT_TIERS);
    expect(body.preemptlyZoneDays).toBe(DEFAULT_PREEMPTLY_ZONE_DAYS);
    expect(body.discountsEnabled).toBe(true);
  });

  it("GET /discounts/tiers → custom tiers when settings exist", async () => {
    const customTiers = [{ daysBeforeEmpty: 3, discountAmount: 100 }];
    (mockPrisma.retailerSettings.findUnique as any).mockResolvedValue({
      retailerId: "retailer-1",
      discountTiers: customTiers,
      preemptlyZoneDays: 7,
      discountsEnabled: false,
    });
    const app = createTestApp(createDiscountsTestModule(), "retailer");
    const res = await makeRequest(app, "GET", "/discounts/tiers");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tiers).toEqual(customTiers);
    expect(body.preemptlyZoneDays).toBe(7);
    expect(body.discountsEnabled).toBe(false);
  });

  it("PUT /discounts/tiers → 200 updates tiers", async () => {
    const newTiers = [{ daysBeforeEmpty: 3, discountAmount: 50 }];
    (mockPrisma.retailer.findUnique as any).mockResolvedValue(mockRetailer);
    (mockPrisma.retailerSettings.upsert as any).mockResolvedValue({
      retailerId: "retailer-1",
      discountTiers: newTiers,
    });
    const app = createTestApp(createDiscountsTestModule(), "retailer");
    const res = await makeRequest(app, "PUT", "/discounts/tiers", { tiers: newTiers });
    expect(res.status).toBe(200);
  });

  it("PATCH /discounts/toggle → 200 toggles discounts", async () => {
    (mockPrisma.retailerSettings.upsert as any).mockResolvedValue({
      retailerId: "retailer-1",
      discountsEnabled: false,
    });
    const app = createTestApp(createDiscountsTestModule(), "retailer");
    const res = await makeRequest(app, "PATCH", "/discounts/toggle", { enabled: false });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.discountsEnabled).toBe(false);
  });

  it("calculateDiscount returns correct discount for days remaining", async () => {
    const { DiscountsService } = require("./service");
    (mockPrisma.retailerSettings.findUnique as any).mockResolvedValue({
      retailerId: "retailer-1",
      discountTiers: DEFAULT_DISCOUNT_TIERS,
      preemptlyZoneDays: 5,
      discountsEnabled: true,
    });
    // With default tiers sorted desc: 5→50, 4→40, 3→30...
    // 3 <= 5 (first tier) → discount is 50
    const discount = await DiscountsService.calculateDiscount("retailer-1", 3);
    expect(discount).toBe(50);
  });
});
