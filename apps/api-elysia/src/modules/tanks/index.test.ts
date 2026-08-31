import { describe, it, expect, beforeEach } from "bun:test";
import { mockPrisma, resetMocks, createTestApp, makeRequest, mockTank, mockLocation, mockEstimation } from "../../test/helpers";
import { Elysia } from "elysia";
import { CreateTankBody, UpdateTankBody, AdjustTankBody } from "./model";

function createTanksTestModule() {
  const { TanksService } = require("./service");
  return new Elysia({ prefix: "/tanks" })
    .post("/", async ({ currentUser, body }: any) => {
      return TanksService.create(currentUser.id, body);
    }, { body: CreateTankBody })
    .get("/", async ({ currentUser }: any) => {
      return TanksService.findAllByUser(currentUser.id);
    })
    .get("/:id", async ({ currentUser, params }: any) => {
      return TanksService.findOne(params.id, currentUser.id);
    })
    .patch("/:id", async ({ currentUser, params, body }: any) => {
      return TanksService.update(params.id, currentUser.id, body);
    }, { body: UpdateTankBody })
    .delete("/:id", async ({ currentUser, params }: any) => {
      return TanksService.remove(params.id, currentUser.id);
    })
    .get("/:id/prediction", async ({ currentUser, params }: any) => {
      return TanksService.getPrediction(params.id, currentUser.id);
    })
    .post("/:id/adjust", async ({ currentUser, params, body }: any) => {
      return TanksService.adjust(params.id, currentUser.id, body.adjustment);
    }, { body: AdjustTankBody });
}

const tankWithLocation = { ...mockTank, location: mockLocation };
const fullTank = { ...mockTank, location: mockLocation, estimation: mockEstimation, refillLogs: [] };

describe("tanks module", () => {
  beforeEach(() => resetMocks());

  it("POST /tanks → 200 creates tank with estimation", async () => {
    (mockPrisma.location.findUnique as any).mockResolvedValue(mockLocation);
    (mockPrisma.tank.create as any).mockResolvedValue(mockTank);
    const app = createTestApp(createTanksTestModule());
    const res = await makeRequest(app, "POST", "/tanks", {
      locationId: "location-1",
      capacityKg: 11,
      model: "EXCHANGE",
      usageLevel: "MODERATE",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.capacityKg).toBe(11);
  });

  it("POST /tanks → 404 location not found", async () => {
    (mockPrisma.location.findUnique as any).mockResolvedValue(null);
    const app = createTestApp(createTanksTestModule());
    const res = await makeRequest(app, "POST", "/tanks", {
      locationId: "bad-id",
      capacityKg: 11,
      model: "EXCHANGE",
      usageLevel: "MODERATE",
    });
    expect(res.status).toBe(404);
  });

  it("GET /tanks → 200 returns array", async () => {
    (mockPrisma.tank.findMany as any).mockResolvedValue([tankWithLocation]);
    const app = createTestApp(createTanksTestModule());
    const res = await makeRequest(app, "GET", "/tanks");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /tanks/:id → 200 returns tank", async () => {
    (mockPrisma.tank.findUnique as any).mockResolvedValue(fullTank);
    const app = createTestApp(createTanksTestModule());
    const res = await makeRequest(app, "GET", "/tanks/tank-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("tank-1");
  });

  it("PATCH /tanks/:id → 200 updates tank", async () => {
    (mockPrisma.tank.findUnique as any).mockResolvedValue(tankWithLocation);
    const updated = { ...mockTank, capacityKg: 22 };
    (mockPrisma.tank.update as any).mockResolvedValue(updated);
    const app = createTestApp(createTanksTestModule());
    const res = await makeRequest(app, "PATCH", "/tanks/tank-1", { capacityKg: 22 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.capacityKg).toBe(22);
  });

  it("DELETE /tanks/:id → 200 deletes tank", async () => {
    (mockPrisma.tank.findUnique as any).mockResolvedValue(tankWithLocation);
    (mockPrisma.tank.delete as any).mockResolvedValue(mockTank);
    const app = createTestApp(createTanksTestModule());
    const res = await makeRequest(app, "DELETE", "/tanks/tank-1");
    expect(res.status).toBe(200);
  });

  it("GET /tanks/:id/prediction → 200 returns prediction", async () => {
    (mockPrisma.tank.findUnique as any).mockResolvedValue(tankWithLocation);
    const app = createTestApp(createTanksTestModule());
    const res = await makeRequest(app, "GET", "/tanks/tank-1/prediction");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.estimatedRemainingDays).toBeDefined();
  });

  it("POST /tanks/:id/adjust COOKED_MORE → 200", async () => {
    (mockPrisma.tank.findUnique as any).mockResolvedValue(tankWithLocation);
    (mockPrisma.estimation.update as any).mockResolvedValue(mockEstimation);
    const app = createTestApp(createTanksTestModule());
    const res = await makeRequest(app, "POST", "/tanks/tank-1/adjust", { adjustment: "COOKED_MORE" });
    expect(res.status).toBe(200);
  });

  it("POST /tanks/:id/adjust COOKED_LESS → 200", async () => {
    (mockPrisma.tank.findUnique as any).mockResolvedValue(tankWithLocation);
    (mockPrisma.estimation.update as any).mockResolvedValue(mockEstimation);
    const app = createTestApp(createTanksTestModule());
    const res = await makeRequest(app, "POST", "/tanks/tank-1/adjust", { adjustment: "COOKED_LESS" });
    expect(res.status).toBe(200);
  });

  it("GET /tanks/:id → 403 wrong user", async () => {
    const wrongTank = { ...fullTank, location: { ...mockLocation, userId: "other-user" } };
    (mockPrisma.tank.findUnique as any).mockResolvedValue(wrongTank);
    const app = createTestApp(createTanksTestModule());
    const res = await makeRequest(app, "GET", "/tanks/tank-1");
    expect(res.status).toBe(403);
  });
});
