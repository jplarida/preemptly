import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, createTestApp, makeRequest, mockTank, mockLocation, mockEstimation } from "../../test/helpers";
import { Elysia } from "elysia";
import { LogRefillBody } from "./model";

function createRefillsTestModule() {
  const { RefillsService } = require("./service");
  return new Elysia({ prefix: "/refills" })
    .post("/", async ({ currentUser, body }: any) => {
      return RefillsService.logRefill(currentUser.id, body);
    }, { body: LogRefillBody })
    .get("/tank/:tankId", async ({ currentUser, params }: any) => {
      return RefillsService.getHistory(params.tankId, currentUser.id);
    })
    .patch("/:id/confirm", async ({ currentUser, params }: any) => {
      return RefillsService.confirmOutlier(params.id, currentUser.id);
    });
}

const fullTank = {
  ...mockTank,
  location: mockLocation,
  estimation: mockEstimation,
  refillLogs: [],
};

const mockRefillLog = {
  id: "refill-1",
  tankId: "tank-1",
  refillDate: new Date(),
  actualCycleDays: 30,
  isOutlier: false,
  confirmedByUser: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("refills module", () => {
  beforeEach(() => resetMocks());

  it("POST /refills → 200 logs refill with outlier detection", async () => {
    (mockPrisma.tank.findUnique as any).mockResolvedValue(fullTank);
    (mockPrisma.refillLog.create as any).mockResolvedValue(mockRefillLog);
    (mockPrisma.tank.update as any).mockResolvedValue(mockTank);
    (mockPrisma.estimation.update as any).mockResolvedValue(mockEstimation);
    const app = createTestApp(createRefillsTestModule());
    const res = await makeRequest(app, "POST", "/refills", { tankId: "tank-1" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isOutlier).toBeDefined();
  });

  it("POST /refills → 404 tank not found", async () => {
    (mockPrisma.tank.findUnique as any).mockResolvedValue(null);
    const app = createTestApp(createRefillsTestModule());
    const res = await makeRequest(app, "POST", "/refills", { tankId: "bad-id" });
    expect(res.status).toBe(404);
  });

  it("GET /refills/tank/:tankId → 200 returns history", async () => {
    const tankWithLoc = { ...mockTank, location: mockLocation };
    (mockPrisma.tank.findUnique as any).mockResolvedValue(tankWithLoc);
    (mockPrisma.refillLog.findMany as any).mockResolvedValue([mockRefillLog]);
    const app = createTestApp(createRefillsTestModule());
    const res = await makeRequest(app, "GET", "/refills/tank/tank-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("PATCH /refills/:id/confirm → 200 confirms outlier", async () => {
    const refillWithTank = {
      ...mockRefillLog,
      isOutlier: true,
      tank: { ...mockTank, location: mockLocation },
    };
    (mockPrisma.refillLog.findUnique as any).mockResolvedValue(refillWithTank);
    (mockPrisma.refillLog.update as any).mockResolvedValue({ ...mockRefillLog, confirmedByUser: true, isOutlier: false });
    const app = createTestApp(createRefillsTestModule());
    const res = await makeRequest(app, "PATCH", "/refills/refill-1/confirm");
    expect(res.status).toBe(200);
  });

  it("PATCH /refills/:id/confirm → 404 not found", async () => {
    (mockPrisma.refillLog.findUnique as any).mockResolvedValue(null);
    const app = createTestApp(createRefillsTestModule());
    const res = await makeRequest(app, "PATCH", "/refills/nonexistent/confirm");
    expect(res.status).toBe(404);
  });
});
